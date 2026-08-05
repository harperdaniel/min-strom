import { createHmac, timingSafeEqual } from "node:crypto";

import { type Request, type Response } from "express";

import { type ApiConfig } from "./config.js";

export const SESSION_COOKIE_NAME = "minstrom_session";

const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export interface SessionUser {
  id: string;
  username: string;
}

export interface SessionPayload {
  sub: string;
  username: string;
  exp: number;
}

export function setSessionCookie(
  response: Response,
  config: ApiConfig,
  user: SessionUser
): void {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds;
  const payload: SessionPayload = {
    exp: expiresAt,
    sub: user.id,
    username: user.username
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(body, getSessionSecret(config));

  response.setHeader(
    "Set-Cookie",
    serializeCookie(`${body}.${signature}`, {
      httpOnly: true,
      maxAge: sessionMaxAgeSeconds,
      sameSite: "Lax",
      secure: config.SESSION_COOKIE_SECURE
    })
  );
}

export function clearSessionCookie(response: Response, config: ApiConfig): void {
  response.setHeader(
    "Set-Cookie",
    serializeCookie("", {
      httpOnly: true,
      maxAge: 0,
      sameSite: "Lax",
      secure: config.SESSION_COOKIE_SECURE
    })
  );
}

export function readSession(
  request: Request,
  config: ApiConfig
): SessionPayload | null {
  const rawCookie = parseCookies(request.headers.cookie)[SESSION_COOKIE_NAME];

  if (!rawCookie) {
    return null;
  }

  const [body, signature] = rawCookie.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = sign(body, getSessionSecret(config));

  if (!safeEqual(signature, expected)) {
    return null;
  }

  const payload = parsePayload(body);

  if (!payload || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

function getSessionSecret(config: ApiConfig): string {
  if (config.SESSION_SECRET) {
    return config.SESSION_SECRET;
  }

  if (config.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }

  return "minstrom-local-development-session-secret";
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parsePayload(body: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as Partial<SessionPayload> | null;

    if (
      parsed &&
      typeof parsed.sub === "string" &&
      typeof parsed.username === "string" &&
      typeof parsed.exp === "number"
    ) {
      return {
        exp: parsed.exp,
        sub: parsed.sub,
        username: parsed.username
      };
    }
  } catch {
    return null;
  }

  return null;
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  return Object.fromEntries(
    header.split(";").flatMap((part) => {
      const [key, ...valueParts] = part.trim().split("=");

      if (!key) {
        return [];
      }

      return [[key, valueParts.join("=")]];
    })
  );
}

function serializeCookie(
  value: string,
  options: {
    httpOnly: boolean;
    maxAge: number;
    sameSite: "Lax";
    secure: boolean;
  }
): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite}`
  ];

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}
