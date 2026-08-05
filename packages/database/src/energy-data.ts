import {
  type ConnectionStatus,
  type DateRange,
  type MeterDirection,
  type MeterPointDraft,
  type MeterValueDraft,
  type MeterValueQuality,
  type ProviderType,
  type SyncStatus
} from "@minstrom/domain";
import { Pool, type PoolConfig } from "pg";

export interface DataConnectionRecord {
  id: string;
  userId: string;
  providerType: ProviderType;
  status: ConnectionStatus;
  encryptedCredentials: string | null;
  credentialKeyVersion: number | null;
  externalGrantId: string | null;
  accessStartsAt: Date | null;
  accessEndsAt: Date | null;
  lastSyncAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  lastErrorCode: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

export interface MeterPointRecord {
  id: string;
  connectionId: string;
  externalMeterPointId: string;
  name: string;
  address: string | null;
  priceArea: string | null;
  gridOwner: string | null;
  consumptionType: string | null;
  activeFrom: Date | null;
  activeTo: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeterValueRecord {
  meterPointId: string;
  intervalStart: Date;
  intervalEnd: Date;
  valueKwh: number;
  direction: MeterDirection;
  quality: MeterValueQuality;
  verified: boolean | null;
  sourceRevision: string | null;
  receivedAt: Date;
  updatedAt: Date;
}

export interface SyncRunRecord {
  id: string;
  connectionId: string;
  meterPointId: string | null;
  status: SyncStatus;
  periodFrom: Date;
  periodTo: Date;
  startedAt: Date;
  finishedAt: Date | null;
  recordsReceived: number;
  recordsInserted: number;
  recordsUpdated: number;
  errorCode: string | null;
  errorMessageSanitized: string | null;
}

export interface UpsertDataConnectionInput {
  userId: string;
  providerType: ProviderType;
  encryptedCredentials: string;
  credentialKeyVersion: number;
  status: ConnectionStatus;
  lastErrorCode: string | null;
  metadata?: Record<string, unknown>;
}

export interface MeterValueWriteStats {
  received: number;
  inserted: number;
  updated: number;
}

export interface CreateSyncRunInput {
  connectionId: string;
  meterPointId?: string | null;
  periodFrom: Date;
  periodTo: Date;
  status: SyncStatus;
}

export interface FinishSyncRunInput {
  status: SyncStatus;
  recordsReceived: number;
  recordsInserted: number;
  recordsUpdated: number;
  errorCode: string | null;
  errorMessageSanitized: string | null;
}

export interface UpdateConnectionSyncResultInput {
  status: ConnectionStatus;
  succeeded: boolean;
  lastErrorCode: string | null;
}

export interface DashboardSourceRecord {
  connection: DataConnectionRecord;
  meterPoint: MeterPointRecord;
  values: MeterValueRecord[];
}

export interface EnergyDataRepository {
  upsertDataConnection(input: UpsertDataConnectionInput): Promise<DataConnectionRecord>;
  updateConnectionSyncResult(
    connectionId: string,
    input: UpdateConnectionSyncResultInput
  ): Promise<DataConnectionRecord>;
  upsertMeterPoint(
    connectionId: string,
    input: MeterPointDraft
  ): Promise<MeterPointRecord>;
  upsertMeterValues(
    meterPointId: string,
    values: MeterValueDraft[]
  ): Promise<MeterValueWriteStats>;
  createSyncRun(input: CreateSyncRunInput): Promise<SyncRunRecord>;
  finishSyncRun(id: string, input: FinishSyncRunInput): Promise<SyncRunRecord>;
  getDashboardSource(
    userId: string,
    period: DateRange
  ): Promise<DashboardSourceRecord | null>;
}

interface DataConnectionRow {
  id: string;
  userId: string;
  providerType: ProviderType;
  status: ConnectionStatus;
  encryptedCredentials: string | null;
  credentialKeyVersion: number | null;
  externalGrantId: string | null;
  accessStartsAt: Date | null;
  accessEndsAt: Date | null;
  lastSyncAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  lastErrorCode: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

interface MeterPointRow {
  id: string;
  connectionId: string;
  externalMeterPointId: string;
  name: string;
  address: string | null;
  priceArea: string | null;
  gridOwner: string | null;
  consumptionType: string | null;
  activeFrom: Date | null;
  activeTo: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MeterValueRow {
  meterPointId: string;
  intervalStart: Date;
  intervalEnd: Date;
  valueKwh: string;
  direction: MeterDirection;
  quality: MeterValueQuality;
  verified: boolean | null;
  sourceRevision: string | null;
  receivedAt: Date;
  updatedAt: Date;
}

interface SyncRunRow {
  id: string;
  connectionId: string;
  meterPointId: string | null;
  status: SyncStatus;
  periodFrom: Date;
  periodTo: Date;
  startedAt: Date;
  finishedAt: Date | null;
  recordsReceived: number;
  recordsInserted: number;
  recordsUpdated: number;
  errorCode: string | null;
  errorMessageSanitized: string | null;
}

const dataConnectionSelect = [
  "id",
  'user_id AS "userId"',
  'provider_type AS "providerType"',
  "status",
  'encrypted_credentials AS "encryptedCredentials"',
  'credential_key_version AS "credentialKeyVersion"',
  'external_grant_id AS "externalGrantId"',
  'access_starts_at AS "accessStartsAt"',
  'access_ends_at AS "accessEndsAt"',
  'last_sync_at AS "lastSyncAt"',
  'last_successful_sync_at AS "lastSuccessfulSyncAt"',
  'last_error_code AS "lastErrorCode"',
  "metadata",
  'created_at AS "createdAt"',
  'updated_at AS "updatedAt"',
  'revoked_at AS "revokedAt"'
].join(", ");

const meterPointSelect = [
  "id",
  'connection_id AS "connectionId"',
  'external_meter_point_id AS "externalMeterPointId"',
  "name",
  "address",
  'price_area AS "priceArea"',
  'grid_owner AS "gridOwner"',
  'consumption_type AS "consumptionType"',
  'active_from AS "activeFrom"',
  'active_to AS "activeTo"',
  "metadata",
  'created_at AS "createdAt"',
  'updated_at AS "updatedAt"'
].join(", ");

const meterValueSelect = [
  'meter_point_id AS "meterPointId"',
  'interval_start AS "intervalStart"',
  'interval_end AS "intervalEnd"',
  'value_kwh AS "valueKwh"',
  "direction",
  "quality",
  "verified",
  'source_revision AS "sourceRevision"',
  'received_at AS "receivedAt"',
  'updated_at AS "updatedAt"'
].join(", ");

const syncRunSelect = [
  "id",
  'connection_id AS "connectionId"',
  'meter_point_id AS "meterPointId"',
  "status",
  'period_from AS "periodFrom"',
  'period_to AS "periodTo"',
  'started_at AS "startedAt"',
  'finished_at AS "finishedAt"',
  'records_received AS "recordsReceived"',
  'records_inserted AS "recordsInserted"',
  'records_updated AS "recordsUpdated"',
  'error_code AS "errorCode"',
  'error_message_sanitized AS "errorMessageSanitized"'
].join(", ");

export async function runEnergyMigrations(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await pool.query(
      [
        "DO $$",
        "BEGIN",
        "  CREATE TYPE provider_type AS ENUM ('ELVIA_TOKEN', 'ELHUB_CONSENT', 'MOCK');",
        "EXCEPTION WHEN duplicate_object THEN null;",
        "END $$;"
      ].join("\n")
    );
    await pool.query(
      [
        "DO $$",
        "BEGIN",
        "  CREATE TYPE connection_status AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'REVOKED');",
        "EXCEPTION WHEN duplicate_object THEN null;",
        "END $$;"
      ].join("\n")
    );
    await pool.query(
      [
        "DO $$",
        "BEGIN",
        "  CREATE TYPE sync_status AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');",
        "EXCEPTION WHEN duplicate_object THEN null;",
        "END $$;"
      ].join("\n")
    );
    await pool.query(
      [
        "DO $$",
        "BEGIN",
        "  CREATE TYPE meter_direction AS ENUM ('CONSUMPTION', 'PRODUCTION');",
        "EXCEPTION WHEN duplicate_object THEN null;",
        "END $$;"
      ].join("\n")
    );
    await pool.query(
      [
        "DO $$",
        "BEGIN",
        "  CREATE TYPE meter_value_quality AS ENUM ('VERIFIED', 'PRELIMINARY', 'UNKNOWN');",
        "EXCEPTION WHEN duplicate_object THEN null;",
        "END $$;"
      ].join("\n")
    );
    await pool.query(
      [
        "CREATE TABLE IF NOT EXISTS data_connections (",
        "  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,",
        "  provider_type provider_type NOT NULL,",
        "  status connection_status NOT NULL DEFAULT 'PENDING',",
        "  encrypted_credentials text,",
        "  credential_key_version integer,",
        "  external_grant_id text,",
        "  access_starts_at timestamptz,",
        "  access_ends_at timestamptz,",
        "  last_sync_at timestamptz,",
        "  last_successful_sync_at timestamptz,",
        "  last_error_code text,",
        "  revoked_at timestamptz,",
        "  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,",
        "  created_at timestamptz NOT NULL DEFAULT now(),",
        "  updated_at timestamptz NOT NULL DEFAULT now()",
        ")"
      ].join("\n")
    );
    await pool.query(
      [
        "CREATE UNIQUE INDEX IF NOT EXISTS data_connections_user_provider_open_unique",
        "ON data_connections (user_id, provider_type)",
        "WHERE revoked_at IS NULL"
      ].join("\n")
    );
    await pool.query(
      [
        "CREATE TABLE IF NOT EXISTS meter_points (",
        "  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  connection_id uuid NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,",
        "  external_meter_point_id text NOT NULL,",
        "  name varchar(160) NOT NULL,",
        "  address text,",
        "  price_area varchar(16),",
        "  grid_owner varchar(160),",
        "  consumption_type varchar(80),",
        "  active_from timestamptz,",
        "  active_to timestamptz,",
        "  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,",
        "  created_at timestamptz NOT NULL DEFAULT now(),",
        "  updated_at timestamptz NOT NULL DEFAULT now()",
        ")"
      ].join("\n")
    );
    await pool.query(
      [
        "CREATE UNIQUE INDEX IF NOT EXISTS meter_points_connection_external_unique",
        "ON meter_points (connection_id, external_meter_point_id)"
      ].join("\n")
    );
    await pool.query(
      [
        "CREATE TABLE IF NOT EXISTS meter_values (",
        "  meter_point_id uuid NOT NULL REFERENCES meter_points(id) ON DELETE CASCADE,",
        "  interval_start timestamptz NOT NULL,",
        "  interval_end timestamptz NOT NULL,",
        "  value_kwh numeric(14, 6) NOT NULL,",
        "  direction meter_direction NOT NULL,",
        "  quality meter_value_quality NOT NULL DEFAULT 'UNKNOWN',",
        "  verified boolean,",
        "  source_revision text,",
        "  received_at timestamptz NOT NULL DEFAULT now(),",
        "  updated_at timestamptz NOT NULL DEFAULT now()",
        ")"
      ].join("\n")
    );
    await pool.query(
      [
        "CREATE UNIQUE INDEX IF NOT EXISTS meter_values_meter_interval_direction_unique",
        "ON meter_values (meter_point_id, interval_start, direction)"
      ].join("\n")
    );
    await pool.query(
      [
        "CREATE TABLE IF NOT EXISTS sync_runs (",
        "  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  connection_id uuid NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,",
        "  meter_point_id uuid REFERENCES meter_points(id) ON DELETE SET NULL,",
        "  status sync_status NOT NULL DEFAULT 'QUEUED',",
        "  period_from timestamptz NOT NULL,",
        "  period_to timestamptz NOT NULL,",
        "  started_at timestamptz NOT NULL DEFAULT now(),",
        "  finished_at timestamptz,",
        "  records_received integer NOT NULL DEFAULT 0,",
        "  records_inserted integer NOT NULL DEFAULT 0,",
        "  records_updated integer NOT NULL DEFAULT 0,",
        "  error_code text,",
        "  error_message_sanitized text",
        ")"
      ].join("\n")
    );
  } finally {
    await pool.end();
  }
}

export class PostgresEnergyDataRepository implements EnergyDataRepository {
  private readonly pool: Pool;

  constructor(config: PoolConfig | string) {
    this.pool =
      typeof config === "string"
        ? new Pool({ connectionString: config })
        : new Pool(config);
  }

  async upsertDataConnection(
    input: UpsertDataConnectionInput
  ): Promise<DataConnectionRecord> {
    const result = await this.pool.query<DataConnectionRow>(
      [
        "INSERT INTO data_connections (",
        "  user_id, provider_type, encrypted_credentials, credential_key_version, status, last_error_code, metadata",
        ") VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)",
        "ON CONFLICT (user_id, provider_type) WHERE revoked_at IS NULL",
        "DO UPDATE SET",
        "  encrypted_credentials = EXCLUDED.encrypted_credentials,",
        "  credential_key_version = EXCLUDED.credential_key_version,",
        "  status = EXCLUDED.status,",
        "  last_error_code = EXCLUDED.last_error_code,",
        "  metadata = EXCLUDED.metadata,",
        "  updated_at = now()",
        "RETURNING " + dataConnectionSelect
      ].join("\n"),
      [
        input.userId,
        input.providerType,
        input.encryptedCredentials,
        input.credentialKeyVersion,
        input.status,
        input.lastErrorCode,
        JSON.stringify(input.metadata ?? {})
      ]
    );

    return requireDataConnectionRow(result.rows[0]);
  }

  async updateConnectionSyncResult(
    connectionId: string,
    input: UpdateConnectionSyncResultInput
  ): Promise<DataConnectionRecord> {
    const result = await this.pool.query<DataConnectionRow>(
      [
        "UPDATE data_connections",
        "SET",
        "  status = $2,",
        "  last_sync_at = now(),",
        "  last_successful_sync_at = CASE WHEN $3 THEN now() ELSE last_successful_sync_at END,",
        "  last_error_code = $4,",
        "  updated_at = now()",
        "WHERE id = $1 AND revoked_at IS NULL",
        "RETURNING " + dataConnectionSelect
      ].join("\n"),
      [connectionId, input.status, input.succeeded, input.lastErrorCode]
    );

    return requireDataConnectionRow(result.rows[0]);
  }

  async upsertMeterPoint(
    connectionId: string,
    input: MeterPointDraft
  ): Promise<MeterPointRecord> {
    const result = await this.pool.query<MeterPointRow>(
      [
        "INSERT INTO meter_points (",
        "  connection_id, external_meter_point_id, name, address, price_area, grid_owner, consumption_type, active_from, active_to, metadata",
        ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)",
        "ON CONFLICT (connection_id, external_meter_point_id)",
        "DO UPDATE SET",
        "  name = EXCLUDED.name,",
        "  address = EXCLUDED.address,",
        "  price_area = EXCLUDED.price_area,",
        "  grid_owner = EXCLUDED.grid_owner,",
        "  consumption_type = EXCLUDED.consumption_type,",
        "  active_from = EXCLUDED.active_from,",
        "  active_to = EXCLUDED.active_to,",
        "  metadata = EXCLUDED.metadata,",
        "  updated_at = now()",
        "RETURNING " + meterPointSelect
      ].join("\n"),
      [
        connectionId,
        input.externalMeterPointId,
        input.name,
        input.address,
        input.priceArea,
        input.gridOwner,
        input.consumptionType,
        input.activeFrom,
        input.activeTo,
        JSON.stringify((input as { metadata?: Record<string, unknown> }).metadata ?? {})
      ]
    );

    return requireMeterPointRow(result.rows[0]);
  }

  async upsertMeterValues(
    meterPointId: string,
    values: MeterValueDraft[]
  ): Promise<MeterValueWriteStats> {
    let inserted = 0;
    let updated = 0;

    for (const value of values) {
      const result = await this.pool.query<{ inserted: boolean }>(
        [
          "INSERT INTO meter_values (",
          "  meter_point_id, interval_start, interval_end, value_kwh, direction, quality, verified, source_revision",
          ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          "ON CONFLICT (meter_point_id, interval_start, direction)",
          "DO UPDATE SET",
          "  interval_end = EXCLUDED.interval_end,",
          "  value_kwh = EXCLUDED.value_kwh,",
          "  quality = EXCLUDED.quality,",
          "  verified = EXCLUDED.verified,",
          "  source_revision = EXCLUDED.source_revision,",
          "  updated_at = now()",
          "RETURNING (xmax = 0) AS inserted"
        ].join("\n"),
        [
          meterPointId,
          value.intervalStart,
          value.intervalEnd,
          value.valueKwh,
          value.direction,
          value.quality,
          value.quality === "VERIFIED",
          value.sourceRevision
        ]
      );

      if (result.rows[0]?.inserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    return { inserted, received: values.length, updated };
  }

  async createSyncRun(input: CreateSyncRunInput): Promise<SyncRunRecord> {
    const result = await this.pool.query<SyncRunRow>(
      [
        "INSERT INTO sync_runs (connection_id, meter_point_id, status, period_from, period_to)",
        "VALUES ($1, $2, $3, $4, $5)",
        "RETURNING " + syncRunSelect
      ].join("\n"),
      [
        input.connectionId,
        input.meterPointId ?? null,
        input.status,
        input.periodFrom,
        input.periodTo
      ]
    );

    return requireSyncRunRow(result.rows[0]);
  }

  async finishSyncRun(id: string, input: FinishSyncRunInput): Promise<SyncRunRecord> {
    const result = await this.pool.query<SyncRunRow>(
      [
        "UPDATE sync_runs",
        "SET",
        "  status = $2,",
        "  finished_at = now(),",
        "  records_received = $3,",
        "  records_inserted = $4,",
        "  records_updated = $5,",
        "  error_code = $6,",
        "  error_message_sanitized = $7",
        "WHERE id = $1",
        "RETURNING " + syncRunSelect
      ].join("\n"),
      [
        id,
        input.status,
        input.recordsReceived,
        input.recordsInserted,
        input.recordsUpdated,
        input.errorCode,
        input.errorMessageSanitized
      ]
    );

    return requireSyncRunRow(result.rows[0]);
  }

  async getDashboardSource(
    userId: string,
    period: DateRange
  ): Promise<DashboardSourceRecord | null> {
    const connectionResult = await this.pool.query<DataConnectionRow>(
      [
        "SELECT " + dataConnectionSelect,
        "FROM data_connections",
        "WHERE user_id = $1 AND revoked_at IS NULL AND provider_type = 'ELVIA_TOKEN'",
        "ORDER BY COALESCE(last_successful_sync_at, last_sync_at, created_at) DESC",
        "LIMIT 1"
      ].join("\n"),
      [userId]
    );
    const connection = connectionResult.rows[0]
      ? toDataConnectionRecord(connectionResult.rows[0])
      : null;

    if (!connection) {
      return null;
    }

    const meterPointResult = await this.pool.query<MeterPointRow>(
      [
        "SELECT " + meterPointSelect,
        "FROM meter_points",
        "WHERE connection_id = $1",
        "ORDER BY created_at ASC",
        "LIMIT 1"
      ].join("\n"),
      [connection.id]
    );
    const meterPoint = meterPointResult.rows[0]
      ? toMeterPointRecord(meterPointResult.rows[0])
      : null;

    if (!meterPoint) {
      return { connection, meterPoint: emptyMeterPoint(connection.id), values: [] };
    }

    const valuesResult = await this.pool.query<MeterValueRow>(
      [
        "SELECT " + meterValueSelect,
        "FROM meter_values",
        "WHERE meter_point_id = $1",
        "  AND interval_start >= $2",
        "  AND interval_start < $3",
        "  AND direction = 'CONSUMPTION'",
        "ORDER BY interval_start ASC"
      ].join("\n"),
      [meterPoint.id, period.from, period.to]
    );

    return {
      connection,
      meterPoint,
      values: valuesResult.rows.map(toMeterValueRecord)
    };
  }
}

function emptyMeterPoint(connectionId: string): MeterPointRecord {
  const now = new Date(0);

  return {
    activeFrom: null,
    activeTo: null,
    address: null,
    connectionId,
    consumptionType: null,
    createdAt: now,
    externalMeterPointId: "missing-meter-point",
    gridOwner: "Elvia",
    id: "missing-meter-point",
    metadata: {},
    name: "Elvia-måler",
    priceArea: null,
    updatedAt: now
  };
}

function requireDataConnectionRow(
  row: DataConnectionRow | undefined
): DataConnectionRecord {
  if (!row) {
    throw new Error("Data connection was not found.");
  }

  return toDataConnectionRecord(row);
}

function requireMeterPointRow(row: MeterPointRow | undefined): MeterPointRecord {
  if (!row) {
    throw new Error("Meter point was not found.");
  }

  return toMeterPointRecord(row);
}

function requireSyncRunRow(row: SyncRunRow | undefined): SyncRunRecord {
  if (!row) {
    throw new Error("Sync run was not found.");
  }

  return row;
}

function toDataConnectionRecord(row: DataConnectionRow): DataConnectionRecord {
  return {
    ...row,
    metadata: row.metadata ?? {}
  };
}

function toMeterPointRecord(row: MeterPointRow): MeterPointRecord {
  return {
    ...row,
    metadata: row.metadata ?? {}
  };
}

function toMeterValueRecord(row: MeterValueRow): MeterValueRecord {
  return {
    ...row,
    valueKwh: Number(row.valueKwh)
  };
}
