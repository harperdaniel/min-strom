import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(3000),
  CREDENTIAL_ENCRYPTION_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  ELVIA_API_BASE_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SESSION_COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SESSION_SECRET: z.string().optional(),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173")
});

export type ApiConfig = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): ApiConfig {
  return envSchema.parse(source);
}
