import { randomUUID } from "node:crypto";

import {
  authResponseSchema,
  credentialValidationResponseSchema,
  dashboardSummaryResponseSchema,
  elviaConnectionResponseSchema,
  elviaLinkResponseSchema,
  meResponseSchema,
  providerListResponseSchema
} from "@minstrom/api-contract";
import {
  type ConsumptionProvider,
  type CredentialValidationResult,
  type DateRange,
  type MeterPointDraft,
  type MeterValueDraft,
  type ProviderConnectionContext,
  type ProviderCredentials,
  type ProviderType
} from "@minstrom/domain";
import { type ProviderRegistry } from "@minstrom/providers";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { type ApiConfig } from "./config.js";

function testConfig(): ApiConfig {
  return {
    API_PORT: 3000,
    CREDENTIAL_ENCRYPTION_KEY: "test-credential-key",
    NODE_ENV: "test",
    SESSION_COOKIE_SECURE: false,
    SESSION_SECRET: "test-session-secret",
    WEB_ORIGIN: "http://localhost:5173"
  };
}

function uniqueUsername(prefix: string): string {
  return prefix + "-" + randomUUID().slice(0, 8);
}

describe("api", () => {
  it("returns health", async () => {
    const app = createApp(testConfig());
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toEqual({ ok: true });
  });

  it("lists provider options without exposing provider secrets", async () => {
    const app = createApp(testConfig());
    const response = await request(app).get("/api/providers").expect(200);
    const body = providerListResponseSchema.parse(response.body);

    expect(body.providers).toHaveLength(2);
    expect(body.providers[0]?.status).toBe("AVAILABLE");
    expect(JSON.stringify(body)).not.toContain("token-with");
  });

  it("registers, remembers, and logs out a user", async () => {
    const app = createApp(testConfig());
    const agent = request.agent(app);
    const username = uniqueUsername("daniel");

    const registerResponse = await agent
      .post("/api/auth/register")
      .send({ password: "strong-password-123", username })
      .expect(201);

    const setCookie = registerResponse.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;

    expect(cookieHeader).toContain("minstrom_session");

    const registerBody = authResponseSchema.parse(registerResponse.body);
    expect(registerBody.user).toMatchObject({
      elviaLinkStatus: "NOT_LINKED",
      username
    });

    const meAfterRegister = await agent.get("/api/me").expect(200);
    expect(meResponseSchema.parse(meAfterRegister.body).user?.username).toBe(username);

    await agent.post("/api/auth/logout").expect(200);

    const meAfterLogout = await agent.get("/api/me").expect(200);
    expect(meResponseSchema.parse(meAfterLogout.body).user).toBeNull();
  });

  it("logs in with username and password", async () => {
    const app = createApp(testConfig());
    const username = uniqueUsername("login");

    await request(app)
      .post("/api/auth/register")
      .send({ password: "correct-password-123", username })
      .expect(201);

    await request(app)
      .post("/api/auth/login")
      .send({ password: "wrong-password-123", username })
      .expect(401);

    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ password: "correct-password-123", username })
      .expect(200);

    const loginBody = authResponseSchema.parse(loginResponse.body);
    expect(loginBody.user.username).toBe(username);

    const meResponse = await agent.get("/api/me").expect(200);
    expect(meResponseSchema.parse(meResponse.body).user?.username).toBe(username);
  });

  it("rejects duplicate usernames", async () => {
    const app = createApp(testConfig());
    const username = uniqueUsername("taken");

    await request(app)
      .post("/api/auth/register")
      .send({ password: "strong-password-123", username })
      .expect(201);

    await request(app)
      .post("/api/auth/register")
      .send({ password: "another-password-123", username })
      .expect(409);
  });

  it("validates Elvia tokens through the provider", async () => {
    const app = createApp(testConfig(), {
      providerRegistry: createFakeRegistry(new FakeElviaProvider())
    });
    const response = await request(app)
      .post("/api/connections/elvia/validate")
      .send({ token: "demo-token-with-enough-length" })
      .expect(200);
    const body = credentialValidationResponseSchema.parse(response.body);

    expect(body).toMatchObject({
      providerType: "ELVIA_TOKEN",
      valid: true
    });
  });

  it("links Elvia, prepares meter points, and never echoes the token", async () => {
    const provider = new FakeElviaProvider();
    const app = createApp(testConfig(), {
      providerRegistry: createFakeRegistry(provider)
    });
    const token = "demo-token-with-enough-length";

    await request(app).post("/api/connections/elvia").send({ token }).expect(401);

    const agent = request.agent(app);
    await agent
      .post("/api/auth/register")
      .send({ password: "strong-password-123", username: uniqueUsername("elvia") })
      .expect(201);

    const response = await agent
      .post("/api/connections/elvia")
      .send({ token })
      .expect(200);
    const body = elviaLinkResponseSchema.parse(response.body);

    expect(body.connection).toMatchObject({
      lastErrorCode: null,
      providerType: "ELVIA_TOKEN",
      status: "ACTIVE"
    });
    expect(body.sync.meterPointCount).toBe(1);
    expect(body.sync.valueCount).toBe(0);
    expect(provider.meterValueRequestCount).toBe(0);
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("returns real dashboard data after Elvia linking", async () => {
    const provider = new FakeElviaProvider();
    const app = createApp(testConfig(), {
      providerRegistry: createFakeRegistry(provider)
    });
    const agent = request.agent(app);

    await agent
      .post("/api/auth/register")
      .send({ password: "strong-password-123", username: uniqueUsername("dash") })
      .expect(201);
    await agent
      .post("/api/connections/elvia")
      .send({ token: "demo-token-with-enough-length" })
      .expect(200);

    const response = await agent.get("/api/dashboard").expect(200);
    const dashboard = dashboardSummaryResponseSchema.parse(response.body);

    expect(dashboard.meterPoint).toMatchObject({
      gridOwner: "Elvia",
      name: "Hjemme"
    });
    expect(dashboard.hourly).toHaveLength(6);
    expect(dashboard.monthly).toHaveLength(12);
    expect(provider.meterValueRequestCount).toBeGreaterThan(0);
    expect(dashboard.monthly.some((month) => month.thisYearKwh !== null)).toBe(true);
    expect(dashboard.totals.todayKwh).toBeGreaterThan(0);
  });

  it("marks the Elvia connection as errored when sync fails", async () => {
    const app = createApp(testConfig(), {
      providerRegistry: createFakeRegistry(
        new FakeElviaProvider({
          failSync: true
        })
      )
    });
    const agent = request.agent(app);

    await agent
      .post("/api/auth/register")
      .send({ password: "strong-password-123", username: uniqueUsername("fail") })
      .expect(201);

    await agent
      .post("/api/connections/elvia")
      .send({ token: "demo-token-with-enough-length" })
      .expect(502);

    const response = await agent.get("/api/connections").expect(200);
    const body = elviaConnectionResponseSchema.parse(response.body);

    expect(body.connection).toMatchObject({
      lastErrorCode: "ELVIA_SYNC_FAILED",
      status: "ERROR"
    });
  });

  it("rejects invalid Elvia tokens without storing a connection", async () => {
    const app = createApp(testConfig(), {
      providerRegistry: createFakeRegistry(
        new FakeElviaProvider({
          valid: false
        })
      )
    });
    const agent = request.agent(app);

    await agent
      .post("/api/auth/register")
      .send({ password: "strong-password-123", username: uniqueUsername("bad") })
      .expect(201);

    await agent
      .post("/api/connections/elvia")
      .send({ token: "demo-token-with-enough-length" })
      .expect(400);

    await agent.get("/api/dashboard").expect(404);
  });
});

class FakeElviaProvider implements ConsumptionProvider {
  readonly type = "ELVIA_TOKEN";

  meterValueRequestCount = 0;

  private readonly failSync: boolean;
  private readonly valid: boolean;

  constructor(options: { failSync?: boolean; valid?: boolean } = {}) {
    this.failSync = options.failSync ?? false;
    this.valid = options.valid ?? true;
  }

  validateCredentials(
    credentials: ProviderCredentials
  ): Promise<CredentialValidationResult> {
    return Promise.resolve({
      errorCode:
        credentials.type === "ELVIA_TOKEN" && this.valid
          ? undefined
          : "ELVIA_TOKEN_REJECTED",
      providerType: "ELVIA_TOKEN",
      userMessage:
        credentials.type === "ELVIA_TOKEN" && this.valid
          ? "Elvia-tokenet er gyldig."
          : "Elvia avviste tokenet.",
      valid: credentials.type === "ELVIA_TOKEN" && this.valid
    });
  }

  listMeterPoints(_connection: ProviderConnectionContext): Promise<MeterPointDraft[]> {
    void _connection;

    if (this.failSync) {
      throw new Error("Fake Elvia sync failed.");
    }

    return Promise.resolve([
      {
        activeFrom: new Date("2026-01-01T00:00:00.000Z"),
        activeTo: null,
        address: null,
        consumptionType: "Privatbolig",
        externalMeterPointId: "707057500000000001",
        gridOwner: "Elvia",
        name: "Hjemme",
        priceArea: "NO1"
      }
    ]);
  }

  getMeterValues(
    _connection: ProviderConnectionContext,
    meterPointId: string,
    period: DateRange
  ): Promise<MeterValueDraft[]> {
    void _connection;
    this.meterValueRequestCount += 1;

    const latestDay = new Date(period.to);
    latestDay.setUTCHours(0, 0, 0, 0);

    return Promise.resolve(
      Array.from({ length: 6 }, (_, hour) => {
        const intervalStart = new Date(latestDay);
        intervalStart.setUTCHours(hour + 12);
        const intervalEnd = new Date(intervalStart);
        intervalEnd.setUTCHours(intervalEnd.getUTCHours() + 1);

        return {
          direction: "CONSUMPTION" as const,
          intervalEnd,
          intervalStart,
          meterPointId,
          quality: "VERIFIED" as const,
          sourceRevision: "fake-elvia-v1",
          valueKwh: 1 + hour / 10
        };
      })
    );
  }
}

function createFakeRegistry(provider: ConsumptionProvider): ProviderRegistry {
  return {
    get(type: ProviderType) {
      if (type !== provider.type) {
        throw new Error("Unexpected provider type: " + type);
      }

      return provider;
    },
    list() {
      return [provider];
    }
  };
}
