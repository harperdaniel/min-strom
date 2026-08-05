import {
  credentialValidationResponseSchema,
  providerListResponseSchema
} from "@minstrom/api-contract";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

const app = createApp({
  API_PORT: 3000,
  NODE_ENV: "test",
  WEB_ORIGIN: "http://localhost:5173"
});

describe("api", () => {
  it("returns health", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toEqual({ ok: true });
  });

  it("lists provider options without exposing provider secrets", async () => {
    const response = await request(app).get("/api/providers").expect(200);
    const body = providerListResponseSchema.parse(response.body);

    expect(body.providers).toHaveLength(2);
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it("keeps Elvia validation closed until the data spike is complete", async () => {
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
});
