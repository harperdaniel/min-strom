import {
  CONNECTION_STATUSES,
  METER_DIRECTIONS,
  METER_VALUE_QUALITIES,
  PROVIDER_TYPES,
  SYNC_STATUSES
} from "@minstrom/domain";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const providerTypeEnum = pgEnum("provider_type", PROVIDER_TYPES);
export const connectionStatusEnum = pgEnum("connection_status", CONNECTION_STATUSES);
export const syncStatusEnum = pgEnum("sync_status", SYNC_STATUSES);
export const meterDirectionEnum = pgEnum("meter_direction", METER_DIRECTIONS);
export const meterValueQualityEnum = pgEnum(
  "meter_value_quality",
  METER_VALUE_QUALITIES
);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)]
);

export const dataConnections = pgTable("data_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerType: providerTypeEnum("provider_type").notNull(),
  status: connectionStatusEnum("status").notNull().default("PENDING"),
  encryptedCredentials: text("encrypted_credentials"),
  credentialKeyVersion: integer("credential_key_version"),
  externalGrantId: text("external_grant_id"),
  accessStartsAt: timestamp("access_starts_at", { withTimezone: true }),
  accessEndsAt: timestamp("access_ends_at", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSuccessfulSyncAt: timestamp("last_successful_sync_at", { withTimezone: true }),
  lastErrorCode: text("last_error_code"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps
});

export const meterPoints = pgTable(
  "meter_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => dataConnections.id, { onDelete: "cascade" }),
    externalMeterPointId: text("external_meter_point_id").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    address: text("address"),
    priceArea: varchar("price_area", { length: 16 }),
    gridOwner: varchar("grid_owner", { length: 160 }),
    consumptionType: varchar("consumption_type", { length: 80 }),
    activeFrom: timestamp("active_from", { withTimezone: true }),
    activeTo: timestamp("active_to", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => [
    uniqueIndex("meter_points_connection_external_unique").on(
      table.connectionId,
      table.externalMeterPointId
    )
  ]
);

export const meterValues = pgTable(
  "meter_values",
  {
    meterPointId: uuid("meter_point_id")
      .notNull()
      .references(() => meterPoints.id, { onDelete: "cascade" }),
    intervalStart: timestamp("interval_start", { withTimezone: true }).notNull(),
    intervalEnd: timestamp("interval_end", { withTimezone: true }).notNull(),
    valueKwh: numeric("value_kwh", { precision: 14, scale: 6 }).notNull(),
    direction: meterDirectionEnum("direction").notNull(),
    quality: meterValueQualityEnum("quality").notNull().default("UNKNOWN"),
    verified: boolean("verified"),
    sourceRevision: text("source_revision"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("meter_values_meter_interval_direction_unique").on(
      table.meterPointId,
      table.intervalStart,
      table.direction
    )
  ]
);

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => dataConnections.id, { onDelete: "cascade" }),
  meterPointId: uuid("meter_point_id").references(() => meterPoints.id, {
    onDelete: "set null"
  }),
  status: syncStatusEnum("status").notNull().default("QUEUED"),
  periodFrom: timestamp("period_from", { withTimezone: true }).notNull(),
  periodTo: timestamp("period_to", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  recordsReceived: integer("records_received").notNull().default(0),
  recordsInserted: integer("records_inserted").notNull().default(0),
  recordsUpdated: integer("records_updated").notNull().default(0),
  errorCode: text("error_code"),
  errorMessageSanitized: text("error_message_sanitized")
});

export type UserRow = typeof users.$inferSelect;
export type DataConnectionRow = typeof dataConnections.$inferSelect;
export type MeterPointRow = typeof meterPoints.$inferSelect;
export type MeterValueRow = typeof meterValues.$inferSelect;
export type SyncRunRow = typeof syncRuns.$inferSelect;
