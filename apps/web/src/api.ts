import {
  apiErrorSchema,
  authResponseSchema,
  dashboardSummaryResponseSchema,
  elviaConnectionResponseSchema,
  elviaLinkResponseSchema,
  meResponseSchema,
  type AuthResponse,
  type DashboardSummaryResponse,
  type ElviaConnectionResponse,
  type ElviaLinkResponse,
  type MeResponse
} from "@minstrom/api-contract";

const env = import.meta.env as Record<string, unknown>;
const apiBaseUrlFromEnv = env["VITE_API_BASE_URL"];
const API_BASE_URL =
  typeof apiBaseUrlFromEnv === "string" && apiBaseUrlFromEnv.length > 0
    ? apiBaseUrlFromEnv.replace(/\/$/, "")
    : import.meta.env.PROD
      ? ""
      : "http://localhost:3000";

export async function fetchDashboard(): Promise<DashboardSummaryResponse> {
  const response = await fetch(API_BASE_URL + "/api/dashboard", {
    credentials: "include"
  });
  const body = await parseJson(response, "Kunne ikke hente dashboarddata.");

  if (!response.ok) {
    throw new Error(readErrorMessage(body, "Kunne ikke hente dashboarddata."));
  }

  return dashboardSummaryResponseSchema.parse(body);
}

export async function fetchDemoDashboard(): Promise<DashboardSummaryResponse> {
  const response = await fetch(API_BASE_URL + "/api/demo/dashboard", {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Kunne ikke hente dashboarddata.");
  }

  const body: unknown = await response.json();
  return dashboardSummaryResponseSchema.parse(body);
}

export async function registerUser(
  username: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(API_BASE_URL + "/api/auth/register", {
    body: JSON.stringify({ password, username }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const body = await parseJson(response, "Kunne ikke opprette bruker.");

  if (!response.ok) {
    throw new Error(readErrorMessage(body, "Kunne ikke opprette bruker."));
  }

  return authResponseSchema.parse(body);
}

export async function loginUser(
  username: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(API_BASE_URL + "/api/auth/login", {
    body: JSON.stringify({ password, username }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const body = await parseJson(response, "Kunne ikke logge inn.");

  if (!response.ok) {
    throw new Error(readErrorMessage(body, "Kunne ikke logge inn."));
  }

  return authResponseSchema.parse(body);
}

export async function logoutUser(): Promise<void> {
  const response = await fetch(API_BASE_URL + "/api/auth/logout", {
    credentials: "include",
    method: "POST"
  });
  const body = await parseJson(response, "Kunne ikke logge ut.");

  if (!response.ok) {
    throw new Error(readErrorMessage(body, "Kunne ikke logge ut."));
  }
}

export async function fetchMe(): Promise<MeResponse> {
  const response = await fetch(API_BASE_URL + "/api/me", {
    credentials: "include"
  });
  const body = await parseJson(response, "Kunne ikke hente bruker.");

  if (!response.ok) {
    throw new Error(readErrorMessage(body, "Kunne ikke hente bruker."));
  }

  return meResponseSchema.parse(body);
}

export async function fetchElviaConnection(): Promise<ElviaConnectionResponse> {
  const response = await fetch(API_BASE_URL + "/api/connections", {
    credentials: "include"
  });
  const body = await parseJson(response, "Kunne ikke hente tilkobling.");

  if (!response.ok) {
    throw new Error(readErrorMessage(body, "Kunne ikke hente tilkobling."));
  }

  return elviaConnectionResponseSchema.parse(body);
}

export async function linkElviaToken(token: string): Promise<ElviaLinkResponse> {
  const response = await fetch(API_BASE_URL + "/api/connections/elvia", {
    body: JSON.stringify({ token }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const body = await parseJson(response, "Kunne ikke koble til Elvia.");

  if (!response.ok) {
    throw new Error(readErrorMessage(body, "Kunne ikke koble til Elvia."));
  }

  return elviaLinkResponseSchema.parse(body);
}

async function parseJson(
  response: Response,
  fallbackMessage: string
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error(fallbackMessage);
  }
}

function readErrorMessage(body: unknown, fallbackMessage: string): string {
  const errorBody = apiErrorSchema.safeParse(body);

  return errorBody.success ? errorBody.data.error.message : fallbackMessage;
}
