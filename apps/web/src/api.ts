import {
  apiErrorSchema,
  credentialValidationResponseSchema,
  dashboardSummaryResponseSchema,
  requestMagicLinkResponseSchema,
  type CredentialValidationResponse,
  type DashboardSummaryResponse
} from "@minstrom/api-contract";

const env = import.meta.env as Record<string, unknown>;
const apiBaseUrlFromEnv = env["VITE_API_BASE_URL"];
const API_BASE_URL =
  typeof apiBaseUrlFromEnv === "string" && apiBaseUrlFromEnv.length > 0
    ? apiBaseUrlFromEnv
    : "http://localhost:3000";

export async function fetchDemoDashboard(): Promise<DashboardSummaryResponse> {
  const response = await fetch(API_BASE_URL + "/api/demo/dashboard");

  if (!response.ok) {
    throw new Error("Kunne ikke hente dashboarddata.");
  }

  const body: unknown = await response.json();
  return dashboardSummaryResponseSchema.parse(body);
}

export async function requestMagicLink(email: string): Promise<void> {
  const response = await fetch(API_BASE_URL + "/api/auth/request-link", {
    body: JSON.stringify({ email }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Kunne ikke sende innloggingslenke.");
  }

  const body: unknown = await response.json();
  requestMagicLinkResponseSchema.parse(body);
}

export async function validateElviaToken(
  token: string
): Promise<CredentialValidationResponse> {
  const response = await fetch(API_BASE_URL + "/api/connections/elvia/validate", {
    body: JSON.stringify({ token }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const body: unknown = await response.json();

  if (!response.ok) {
    const errorBody = apiErrorSchema.safeParse(body);
    throw new Error(
      errorBody.success ? errorBody.data.error.message : "Kunne ikke validere token."
    );
  }

  return credentialValidationResponseSchema.parse(body);
}
