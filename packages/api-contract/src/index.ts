import {
  CONNECTION_STATUSES,
  METER_DIRECTIONS,
  METER_VALUE_QUALITIES,
  PROVIDER_TYPES,
  SYNC_STATUSES
} from "@minstrom/domain";
import { z } from "zod";

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const providerTypeSchema = z.enum(PROVIDER_TYPES);
export const connectionStatusSchema = z.enum(CONNECTION_STATUSES);
export const syncStatusSchema = z.enum(SYNC_STATUSES);
export const meterDirectionSchema = z.enum(METER_DIRECTIONS);
export const meterValueQualitySchema = z.enum(METER_VALUE_QUALITIES);

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string()
  })
});

export const requestMagicLinkRequestSchema = z.object({
  email: z.string().email().max(320)
});

export const requestMagicLinkResponseSchema = z.object({
  accepted: z.literal(true)
});

export const verifyMagicLinkRequestSchema = z.object({
  token: z.string().min(16).max(512)
});

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[A-Za-z0-9._-]+$/)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z.string().min(8).max(256);

export const authCredentialsRequestSchema = z.object({
  username: usernameSchema,
  password: passwordSchema
});

export const elviaLinkStatusSchema = z.enum([
  "NOT_LINKED",
  "LINKED_PENDING_FETCH",
  "ERROR"
]);

export const authUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  elviaLinkStatus: elviaLinkStatusSchema,
  elviaLinkedAt: isoDateTimeSchema.nullable(),
  elviaLastErrorCode: z.string().nullable(),
  lastLoginAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema
});

export const authResponseSchema = z.object({
  user: authUserSchema
});

export const meResponseSchema = z.object({
  user: authUserSchema.nullable()
});

export const logoutResponseSchema = z.object({
  ok: z.literal(true)
});

export const providerInfoSchema = z.object({
  type: providerTypeSchema,
  name: z.string(),
  status: z.enum(["AVAILABLE", "COMING_SOON", "DEVELOPMENT"]),
  connectionMethod: z.enum(["TOKEN_GUIDE", "ELHUB_CONSENT", "MOCK"]),
  userMessage: z.string()
});

export const providerListResponseSchema = z.object({
  providers: z.array(providerInfoSchema)
});

export const elviaCredentialValidationRequestSchema = z.object({
  token: z.string().min(12).max(4096)
});

export const elviaLinkRequestSchema = elviaCredentialValidationRequestSchema;

export const credentialValidationResponseSchema = z.object({
  valid: z.boolean(),
  providerType: providerTypeSchema,
  errorCode: z.string().optional(),
  userMessage: z.string().optional()
});

export const elviaConnectionSchema = z.object({
  providerType: z.literal("ELVIA_TOKEN"),
  status: elviaLinkStatusSchema,
  linkedAt: isoDateTimeSchema.nullable(),
  lastErrorCode: z.string().nullable()
});

export const elviaConnectionResponseSchema = z.object({
  connection: elviaConnectionSchema
});

export const elviaLinkResponseSchema = z.object({
  connection: elviaConnectionSchema,
  validation: credentialValidationResponseSchema
});

export const meterPointSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  priceArea: z.string().nullable(),
  gridOwner: z.string().nullable(),
  consumptionType: z.string().nullable()
});

export const meterValueSchema = z.object({
  intervalStart: isoDateTimeSchema,
  intervalEnd: isoDateTimeSchema,
  valueKwh: z.number().nonnegative(),
  direction: meterDirectionSchema,
  quality: meterValueQualitySchema
});

export const dashboardSummaryResponseSchema = z.object({
  meterPoint: meterPointSchema,
  lastSuccessfulSyncAt: isoDateTimeSchema.nullable(),
  totals: z.object({
    todayKwh: z.number().nonnegative(),
    last7DaysKwh: z.number().nonnegative(),
    monthKwh: z.number().nonnegative()
  }),
  peak: z
    .object({
      intervalStart: isoDateTimeSchema,
      intervalEnd: isoDateTimeSchema,
      valueKwh: z.number().nonnegative()
    })
    .nullable(),
  hourly: z.array(meterValueSchema),
  daily: z.array(
    z.object({
      date: z.string(),
      valueKwh: z.number().nonnegative()
    })
  )
});

export const syncRunSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  meterPointId: z.string().nullable(),
  status: syncStatusSchema,
  periodFrom: isoDateTimeSchema,
  periodTo: isoDateTimeSchema,
  startedAt: isoDateTimeSchema,
  finishedAt: isoDateTimeSchema.nullable(),
  recordsReceived: z.number().int().nonnegative(),
  recordsInserted: z.number().int().nonnegative(),
  recordsUpdated: z.number().int().nonnegative(),
  errorCode: z.string().nullable(),
  errorMessageSanitized: z.string().nullable()
});

export type ProviderInfo = z.infer<typeof providerInfoSchema>;
export type ProviderListResponse = z.infer<typeof providerListResponseSchema>;
export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>;
export type CredentialValidationResponse = z.infer<
  typeof credentialValidationResponseSchema
>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type ElviaConnectionResponse = z.infer<typeof elviaConnectionResponseSchema>;
export type ElviaLinkResponse = z.infer<typeof elviaLinkResponseSchema>;
