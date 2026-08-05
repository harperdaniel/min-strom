import {
  authCredentialsRequestSchema,
  authResponseSchema,
  credentialValidationResponseSchema,
  dashboardSummaryResponseSchema,
  elviaConnectionResponseSchema,
  elviaLinkRequestSchema,
  elviaLinkResponseSchema,
  logoutResponseSchema,
  meResponseSchema,
  providerListResponseSchema,
  type ProviderInfo
} from "@minstrom/api-contract";
import {
  DuplicateUsernameError,
  type ElviaLinkStatus,
  type EnergyDataRepository,
  type UserRecord,
  type UserRepository
} from "@minstrom/database";
import {
  type CredentialValidationResult,
  type DateRange,
  type MeterValueDraft
} from "@minstrom/domain";
import {
  createProviderRegistry,
  ProviderCredentialError,
  ProviderNotReadyError,
  type ProviderRegistry
} from "@minstrom/providers";
import cors from "cors";
import express, { type Express, type Request } from "express";
import helmet from "helmet";

import { hashPassword, verifyPassword } from "./auth.js";
import { loadConfig, type ApiConfig } from "./config.js";
import { credentialKeyVersion, encryptCredential } from "./credentials.js";
import { createDashboardFromSource } from "./dashboard.js";
import { createDemoDashboard } from "./demo-data.js";
import { MemoryEnergyDataRepository } from "./energy-store.js";
import { ApiHttpError, errorHandler, validateBody } from "./http.js";
import { clearSessionCookie, readSession, setSessionCookie } from "./session.js";
import { MemoryUserRepository } from "./user-store.js";

interface AppDependencies {
  energy?: EnergyDataRepository;
  providerRegistry?: ProviderRegistry;
  users?: UserRepository;
}

interface ElviaSyncSummary {
  meterPointCount: number;
  periodFrom: string;
  periodTo: string;
  valueCount: number;
}

function getProviderInfo(): ProviderInfo[] {
  return [
    {
      connectionMethod: "TOKEN_GUIDE",
      name: "Elvia",
      status: "AVAILABLE",
      type: "ELVIA_TOKEN",
      userMessage:
        "Første ekte provider. Du kan koble til med personlig token fra Elvia Min side."
    },
    {
      connectionMethod: "ELHUB_CONSENT",
      name: "Elhub",
      status: "COMING_SOON",
      type: "ELHUB_CONSENT",
      userMessage:
        "Planlagt hovedflyt med ID-porten og samtykke når tredjepartsoppsettet er klart."
    }
  ];
}

export function createApp(
  config: ApiConfig = loadConfig(),
  dependencies: AppDependencies = {}
): Express {
  const app = express();
  const users = dependencies.users ?? new MemoryUserRepository();
  const energy = dependencies.energy ?? new MemoryEnergyDataRepository();
  const registry =
    dependencies.providerRegistry ??
    createProviderRegistry({
      elviaBaseUrl: config.ELVIA_API_BASE_URL
    });

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin: config.WEB_ORIGIN
    })
  );
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/api/providers", (_request, response) => {
    response.json(providerListResponseSchema.parse({ providers: getProviderInfo() }));
  });

  app.post(
    "/api/auth/register",
    validateBody(authCredentialsRequestSchema),
    async (request, response, next) => {
      try {
        const body = authCredentialsRequestSchema.parse(request.body);
        const passwordHash = await hashPassword(body.password);
        const createdUser = await users.createUser({
          passwordHash: passwordHash.passwordHash,
          passwordSalt: passwordHash.passwordSalt,
          username: body.username
        });
        const user = await users.markLogin(createdUser.id);

        setSessionCookie(response, config, {
          id: user.id,
          username: user.username
        });
        response.status(201).json(authResponseSchema.parse({ user: toAuthUser(user) }));
      } catch (error) {
        if (error instanceof DuplicateUsernameError) {
          next(
            new ApiHttpError(
              409,
              "USERNAME_TAKEN",
              "Brukernavnet er allerede i bruk. Velg et annet."
            )
          );
          return;
        }

        next(error);
      }
    }
  );

  app.post(
    "/api/auth/login",
    validateBody(authCredentialsRequestSchema),
    async (request, response, next) => {
      try {
        const body = authCredentialsRequestSchema.parse(request.body);
        const user = await users.findUserByUsername(body.username);

        if (
          !user ||
          !(await verifyPassword(body.password, user.passwordHash, user.passwordSalt))
        ) {
          throw new ApiHttpError(
            401,
            "INVALID_CREDENTIALS",
            "Brukernavn eller passord er feil."
          );
        }

        const loggedInUser = await users.markLogin(user.id);
        setSessionCookie(response, config, {
          id: loggedInUser.id,
          username: loggedInUser.username
        });
        response.json(authResponseSchema.parse({ user: toAuthUser(loggedInUser) }));
      } catch (error) {
        next(error);
      }
    }
  );

  app.post("/api/auth/logout", (_request, response) => {
    clearSessionCookie(response, config);
    response.json(logoutResponseSchema.parse({ ok: true }));
  });

  app.get("/api/me", async (request, response, next) => {
    try {
      const user = await getCurrentUser(request, config, users);

      response.json(
        meResponseSchema.parse({
          user: user ? toAuthUser(user) : null
        })
      );
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/connections", async (request, response, next) => {
    try {
      const user = await requireCurrentUser(request, config, users);

      response.json(
        elviaConnectionResponseSchema.parse({
          connection: toElviaConnection(user)
        })
      );
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/connections/elvia",
    validateBody(elviaLinkRequestSchema),
    async (request, response, next) => {
      try {
        const user = await requireCurrentUser(request, config, users);
        const body = elviaLinkRequestSchema.parse(request.body);
        const validation = await validateElviaCredentials(body.token, registry);

        ensureUsableElviaValidation(validation);

        const encryptedToken = encryptCredential(body.token, config);
        const connection = await energy.upsertDataConnection({
          credentialKeyVersion,
          encryptedCredentials: encryptedToken,
          lastErrorCode: null,
          metadata: {
            connectionMethod: "TOKEN_GUIDE"
          },
          providerType: "ELVIA_TOKEN",
          status: "PENDING",
          userId: user.id
        });
        let sync: ElviaSyncSummary;

        try {
          sync = await syncElviaData({
            connectionId: connection.id,
            energy,
            registry,
            token: body.token,
            user
          });
        } catch (error) {
          await users.linkElviaToken(user.id, {
            encryptedToken,
            keyVersion: credentialKeyVersion,
            lastErrorCode: toSyncErrorCode(error),
            status: "ERROR"
          });
          throw error;
        }

        const linkStatus: ElviaLinkStatus =
          sync.valueCount > 0 ? "ACTIVE" : "LINKED_PENDING_FETCH";
        const lastErrorCode = sync.valueCount > 0 ? null : "ELVIA_NO_VALUES_RETURNED";
        await energy.updateConnectionSyncResult(connection.id, {
          lastErrorCode,
          status: sync.valueCount > 0 ? "ACTIVE" : "PENDING",
          succeeded: true
        });
        const updatedUser = await users.linkElviaToken(user.id, {
          encryptedToken,
          keyVersion: credentialKeyVersion,
          lastErrorCode,
          status: linkStatus
        });

        response.json(
          elviaLinkResponseSchema.parse({
            connection: toElviaConnection(updatedUser),
            sync,
            validation
          })
        );
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/connections/elvia/validate",
    validateBody(elviaLinkRequestSchema),
    async (request, response, next) => {
      try {
        const body = elviaLinkRequestSchema.parse(request.body);
        const result = await validateElviaCredentials(body.token, registry);

        response.json(credentialValidationResponseSchema.parse(result));
      } catch (error) {
        next(error);
      }
    }
  );

  app.get("/api/dashboard", async (request, response, next) => {
    try {
      const user = await requireCurrentUser(request, config, users);
      const period = createDashboardPeriod();
      const source = await energy.getDashboardSource(user.id, period);
      const dashboard = source ? createDashboardFromSource(source) : null;

      if (!dashboard) {
        throw new ApiHttpError(
          404,
          "DATA_NOT_READY",
          "Koble til Elvia for å se egne strømdata."
        );
      }

      response.json(dashboardSummaryResponseSchema.parse(dashboard));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/demo/dashboard", (_request, response) => {
    response.json(dashboardSummaryResponseSchema.parse(createDemoDashboard()));
  });

  app.use(errorHandler);

  return app;
}

async function getCurrentUser(
  request: Request,
  config: ApiConfig,
  users: UserRepository
): Promise<UserRecord | null> {
  const session = readSession(request, config);

  if (!session) {
    return null;
  }

  return users.findUserById(session.sub);
}

async function requireCurrentUser(
  request: Request,
  config: ApiConfig,
  users: UserRepository
): Promise<UserRecord> {
  const user = await getCurrentUser(request, config, users);

  if (!user) {
    throw new ApiHttpError(401, "AUTH_REQUIRED", "Du må være innlogget først.");
  }

  return user;
}

async function validateElviaCredentials(
  token: string,
  registry: ProviderRegistry
): Promise<CredentialValidationResult> {
  try {
    return await registry.get("ELVIA_TOKEN").validateCredentials({
      token,
      type: "ELVIA_TOKEN"
    });
  } catch (error) {
    if (error instanceof ProviderNotReadyError) {
      return {
        errorCode: error.code,
        providerType: "ELVIA_TOKEN",
        userMessage: "Vi klarte ikke å kontakte Elvia akkurat nå. Prøv igjen om litt.",
        valid: false
      };
    }

    throw error;
  }
}

function ensureUsableElviaValidation(validation: CredentialValidationResult): void {
  if (validation.valid) {
    return;
  }

  if (validation.errorCode === "PROVIDER_NOT_READY") {
    throw new ApiHttpError(
      502,
      "ELVIA_API_UNAVAILABLE",
      validation.userMessage ?? "Vi klarte ikke å kontakte Elvia akkurat nå."
    );
  }

  throw new ApiHttpError(
    400,
    validation.errorCode ?? "INVALID_ELVIA_TOKEN",
    validation.userMessage ?? "Elvia-tokenet kunne ikke brukes."
  );
}

async function syncElviaData(input: {
  connectionId: string;
  energy: EnergyDataRepository;
  registry: ProviderRegistry;
  token: string;
  user: UserRecord;
}): Promise<ElviaSyncSummary> {
  const provider = input.registry.get("ELVIA_TOKEN");
  const period = createInitialSyncPeriod();
  const run = await input.energy.createSyncRun({
    connectionId: input.connectionId,
    periodFrom: period.from,
    periodTo: period.to,
    status: "RUNNING"
  });
  let recordsReceived = 0;
  let recordsInserted = 0;
  let recordsUpdated = 0;
  let meterPointCount = 0;

  try {
    const context = {
      connectionId: input.connectionId,
      credentials: {
        token: input.token,
        type: "ELVIA_TOKEN" as const
      },
      providerType: "ELVIA_TOKEN" as const,
      userId: input.user.id
    };
    const meterPoints = await provider.listMeterPoints(context);
    meterPointCount = meterPoints.length;

    for (const meterPointDraft of meterPoints) {
      const meterPoint = await input.energy.upsertMeterPoint(
        input.connectionId,
        meterPointDraft
      );
      const providerValues = (
        await Promise.all(
          createMonthlySyncPeriods(period).map((syncPeriod) =>
            provider.getMeterValues(
              context,
              meterPointDraft.externalMeterPointId,
              syncPeriod
            )
          )
        )
      ).flat();
      const values = providerValues.map<MeterValueDraft>((value) => ({
        ...value,
        meterPointId: meterPoint.id
      }));
      const stats = await input.energy.upsertMeterValues(meterPoint.id, values);

      recordsReceived += stats.received;
      recordsInserted += stats.inserted;
      recordsUpdated += stats.updated;
    }

    await input.energy.finishSyncRun(run.id, {
      errorCode: null,
      errorMessageSanitized: null,
      recordsInserted,
      recordsReceived,
      recordsUpdated,
      status: "SUCCEEDED"
    });

    return {
      meterPointCount,
      periodFrom: period.from.toISOString(),
      periodTo: period.to.toISOString(),
      valueCount: recordsReceived
    };
  } catch (error) {
    const errorCode = toSyncErrorCode(error);
    await input.energy.finishSyncRun(run.id, {
      errorCode,
      errorMessageSanitized: sanitizeErrorMessage(error),
      recordsInserted,
      recordsReceived,
      recordsUpdated,
      status: "FAILED"
    });
    await input.energy.updateConnectionSyncResult(input.connectionId, {
      lastErrorCode: errorCode,
      status: "ERROR",
      succeeded: false
    });

    if (error instanceof ProviderCredentialError) {
      throw new ApiHttpError(
        400,
        "ELVIA_TOKEN_REJECTED",
        "Elvia avviste tokenet. Sjekk tokenet og prøv igjen."
      );
    }

    throw new ApiHttpError(
      502,
      errorCode,
      "Vi klarte ikke å hente måleverdier fra Elvia akkurat nå."
    );
  }
}

function createInitialSyncPeriod(now = new Date()): DateRange {
  const to = new Date(now);
  to.setUTCMinutes(0, 0, 0);

  return {
    from: createStartOfPreviousYear(to),
    to
  };
}

function createDashboardPeriod(now = new Date()): DateRange {
  const to = new Date(now);
  to.setUTCHours(to.getUTCHours() + 1, 0, 0, 0);

  return {
    from: createStartOfPreviousYear(to),
    to
  };
}

function createStartOfPreviousYear(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear() - 1, 0, 1, 0, 0, 0, 0));
}

function createMonthlySyncPeriods(period: DateRange): DateRange[] {
  const periods: DateRange[] = [];
  let cursor = new Date(period.from);

  while (cursor < period.to) {
    const next = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)
    );
    const to = next < period.to ? next : period.to;
    periods.push({ from: new Date(cursor), to });
    cursor = to;
  }

  return periods;
}

function toSyncErrorCode(error: unknown): string {
  if (error instanceof ApiHttpError) {
    return error.code;
  }

  if (error instanceof ProviderCredentialError) {
    return error.code;
  }

  if (error instanceof ProviderNotReadyError) {
    return error.code;
  }

  return "ELVIA_SYNC_FAILED";
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 240);
  }

  return "Unknown sync error.";
}

function toAuthUser(user: UserRecord) {
  return {
    createdAt: user.createdAt.toISOString(),
    elviaLastErrorCode: user.elviaLastErrorCode,
    elviaLinkedAt: toIsoOrNull(user.elviaLinkedAt),
    elviaLinkStatus: user.elviaLinkStatus,
    id: user.id,
    lastLoginAt: toIsoOrNull(user.lastLoginAt),
    username: user.username
  };
}

function toElviaConnection(user: UserRecord) {
  return {
    lastErrorCode: user.elviaLastErrorCode,
    linkedAt: toIsoOrNull(user.elviaLinkedAt),
    providerType: "ELVIA_TOKEN" as const,
    status: user.elviaLinkStatus satisfies ElviaLinkStatus
  };
}

function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}
