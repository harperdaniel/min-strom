import { randomUUID } from "node:crypto";

import {
  authResponseSchema,
  credentialValidationResponseSchema,
  elviaLinkResponseSchema,
  meResponseSchema,
  providerListResponseSchema
} from "@minstrom/api-contract";
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
  return `${prefix}-${randomUUID().slice(0, 8)}`;
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

  it("keeps Elvia validation closed until the data spike is complete", async () => {
    const app = createApp(testConfig());
    const response = await request(app)
      .post("/api/connections/elvia/validate")
      .send({ token: "demo-token-with-enough-length" })
      .expect(200);
    const body = credentialValidationResponseSchema.parse(response.body);

    expect(body).toMatchObject({
      errorCode: "ELVIA_DATASPIKE_REQUIRED",
      providerType: "ELVIA_TOKEN",
      valid: false
    });
  });

  it("only links Elvia tokens for logged-in users and never echoes the token", async () => {
    const app = createApp(testConfig());
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
      lastErrorCode: "ELVIA_DATASPIKE_REQUIRED",
      providerType: "ELVIA_TOKEN",
      status: "LINKED_PENDING_FETCH"
    });
    expect(JSON.stringify(body)).not.toContain(token);
  });
});
