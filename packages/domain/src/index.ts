export const PROVIDER_TYPES = ["ELVIA_TOKEN", "ELHUB_CONSENT", "MOCK"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const CONNECTION_STATUSES = ["PENDING", "ACTIVE", "ERROR", "REVOKED"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const SYNC_STATUSES = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const METER_DIRECTIONS = ["CONSUMPTION", "PRODUCTION"] as const;
export type MeterDirection = (typeof METER_DIRECTIONS)[number];

export const METER_VALUE_QUALITIES = ["VERIFIED", "PRELIMINARY", "UNKNOWN"] as const;
export type MeterValueQuality = (typeof METER_VALUE_QUALITIES)[number];

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  elviaLinkStatus: "NOT_LINKED" | "LINKED_PENDING_FETCH" | "ERROR";
  elviaLinkedAt: Date | null;
  elviaLastErrorCode: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DataConnection {
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
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

export interface MeterPoint {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface MeterValue {
  meterPointId: string;
  intervalStart: Date;
  intervalEnd: Date;
  valueKwh: number;
  direction: MeterDirection;
  quality: MeterValueQuality;
  sourceRevision: string | null;
  receivedAt: Date;
  updatedAt: Date;
}

export interface SyncRun {
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

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ElviaTokenCredentials {
  type: "ELVIA_TOKEN";
  token: string;
}

export interface ElhubConsentCredentials {
  type: "ELHUB_CONSENT";
  grantId: string;
  accessToken?: string;
}

export interface MockCredentials {
  type: "MOCK";
}

export type ProviderCredentials =
  ElviaTokenCredentials | ElhubConsentCredentials | MockCredentials;

export interface CredentialValidationResult {
  valid: boolean;
  providerType: ProviderType;
  errorCode?: string;
  userMessage?: string;
}

export type MeterPointDraft = Omit<
  MeterPoint,
  "id" | "connectionId" | "createdAt" | "updatedAt"
>;

export type MeterValueDraft = Omit<MeterValue, "receivedAt" | "updatedAt">;

export interface ProviderConnectionContext {
  connectionId: string;
  userId: string;
  providerType: ProviderType;
  credentials?: ProviderCredentials;
  externalGrantId?: string;
}

export interface ConsumptionProvider {
  readonly type: ProviderType;

  validateCredentials(
    credentials: ProviderCredentials
  ): Promise<CredentialValidationResult>;

  listMeterPoints(connection: ProviderConnectionContext): Promise<MeterPointDraft[]>;

  getMeterValues(
    connection: ProviderConnectionContext,
    meterPointId: string,
    period: DateRange
  ): Promise<MeterValueDraft[]>;

  revoke?(connection: ProviderConnectionContext): Promise<void>;
}

export interface ConsumptionSummary {
  totalKwh: number;
  count: number;
  periodFrom: Date | null;
  periodTo: Date | null;
  peak: {
    intervalStart: Date;
    intervalEnd: Date;
    valueKwh: number;
  } | null;
}

export function assertValidDateRange(period: DateRange): DateRange {
  if (Number.isNaN(period.from.getTime()) || Number.isNaN(period.to.getTime())) {
    throw new Error("Date range contains an invalid date.");
  }

  if (period.from >= period.to) {
    throw new Error("Date range 'from' must be before 'to'.");
  }

  return period;
}

export function summarizeMeterValues(values: MeterValue[]): ConsumptionSummary {
  let totalKwh = 0;
  let periodFrom: Date | null = null;
  let periodTo: Date | null = null;
  let peak: ConsumptionSummary["peak"] = null;

  for (const value of values) {
    totalKwh += value.valueKwh;

    if (periodFrom === null || value.intervalStart < periodFrom) {
      periodFrom = value.intervalStart;
    }

    if (periodTo === null || value.intervalEnd > periodTo) {
      periodTo = value.intervalEnd;
    }

    if (peak === null || value.valueKwh > peak.valueKwh) {
      peak = {
        intervalStart: value.intervalStart,
        intervalEnd: value.intervalEnd,
        valueKwh: value.valueKwh
      };
    }
  }

  return {
    totalKwh: Number(totalKwh.toFixed(3)),
    count: values.length,
    periodFrom,
    periodTo,
    peak
  };
}
