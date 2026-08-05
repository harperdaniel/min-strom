import {
  authCredentialsRequestSchema,
  authResponseSchema,
  credentialValidationResponseSchema,
  dashboardSummaryResponseSchema,
  elviaConnectionResponseSchema,
  elviaLinkRequestSchema,
  elviaLinkResponseSchema,
  meResponseSchema,
  logoutResponseSchema,
  providerListResponseSchema,
  type ProviderInfo
} from "@minstrom/api-contract";
import {
  DuplicateUsernameError,
  type ElviaLinkStatus,
  type UserRecord,
  type UserRepository
} from "@minstrom/database";
import { type CredentialValidationResult } from "@minstrom/domain";
import { createProviderRegistry, ProviderNotReadyError } from "@minstrom/providers";
import cors from "cors";
import express, { type Express, type Request } from "express";
import helmet from "helmet";

import { hashPassword, verifyPassword } from "./auth.js";
import { loadConfig, type ApiConfig } from "./config.js";
import { credentialKeyVersion, encryptCredential } from "./credentials.js";
import { createDemoDashboard } from "./demo-data.js";
import { ApiHttpError, errorHandler, validateBody } from "./http.js";
import { clearSessionCookie, readSession, setSessionCookie } from "./session.js";
import { MemoryUserRepository } from "./user-store.js";

interface AppDependencies {
  users?: UserRepository;
}

function getProviderInfo(): ProviderInfo[] {
  return [
    {
      connectionMethod: "TOKEN_GUIDE",
      name: "Elvia",
      status: "DEVELOPMENT",
      type: "ELVIA_TOKEN",
      userMessage:
        "Første ekte provider. Tokenflyten kobles opp etter dataspike mot Elvias API."
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
  const registry = createProviderRegistry({
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

        if (!canStoreElviaToken(validation)) {
          throw new ApiHttpError(
            400,
            validation.errorCode ?? "INVALID_ELVIA_TOKEN",
            validation.userMessage ?? "Elvia-tokenet kunne ikke brukes."
          );
        }

        const updatedUser = await users.linkElviaToken(user.id, {
          encryptedToken: encryptCredential(body.token, config),
          keyVersion: credentialKeyVersion,
          lastErrorCode: validation.errorCode ?? null,
          status: "LINKED_PENDING_FETCH"
        });

        response.json(
          elviaLinkResponseSchema.parse({
            connection: toElviaConnection(updatedUser),
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
  registry: ReturnType<typeof createProviderRegistry>
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
        userMessage:
          "Elvia-integrasjonen er koblet for lagring nå, men selve datahentingen må verifiseres i neste steg.",
        valid: false
      };
    }

    throw error;
  }
}

function canStoreElviaToken(validation: CredentialValidationResult): boolean {
  return (
    validation.valid ||
    validation.errorCode === "ELVIA_DATASPIKE_REQUIRED" ||
    validation.errorCode === "PROVIDER_NOT_READY"
  );
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
