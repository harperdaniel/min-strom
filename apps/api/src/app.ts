import {
  credentialValidationResponseSchema,
  dashboardSummaryResponseSchema,
  elviaCredentialValidationRequestSchema,
  providerListResponseSchema,
  requestMagicLinkRequestSchema,
  requestMagicLinkResponseSchema,
  type ProviderInfo
} from "@minstrom/api-contract";
import { createProviderRegistry } from "@minstrom/providers";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { loadConfig, type ApiConfig } from "./config.js";
import { createDemoDashboard } from "./demo-data.js";
import { errorHandler, validateBody } from "./http.js";

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

export function createApp(config: ApiConfig = loadConfig()): Express {
  const app = express();
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
    "/api/auth/request-link",
    validateBody(requestMagicLinkRequestSchema),
    (request, response) => {
      const body = requestMagicLinkRequestSchema.parse(request.body);
      void body.email;

      response.status(202).json(
        requestMagicLinkResponseSchema.parse({
          accepted: true
        })
      );
    }
  );

  app.post(
    "/api/connections/elvia/validate",
    validateBody(elviaCredentialValidationRequestSchema),
    async (request, response, next) => {
      try {
        const body = elviaCredentialValidationRequestSchema.parse(request.body);
        const result = await registry.get("ELVIA_TOKEN").validateCredentials({
          token: body.token,
          type: "ELVIA_TOKEN"
        });

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
