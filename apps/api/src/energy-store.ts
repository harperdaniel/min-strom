import { randomUUID } from "node:crypto";

import {
  type CreateSyncRunInput,
  type DashboardSourceRecord,
  type DataConnectionRecord,
  type EnergyDataRepository,
  type FinishSyncRunInput,
  type MeterPointRecord,
  type MeterValueRecord,
  type MeterValueWriteStats,
  type SyncRunRecord,
  type UpdateConnectionSyncResultInput,
  type UpsertDataConnectionInput
} from "@minstrom/database";
import {
  type DateRange,
  type MeterPointDraft,
  type MeterValueDraft
} from "@minstrom/domain";

export class MemoryEnergyDataRepository implements EnergyDataRepository {
  private readonly connections = new Map<string, DataConnectionRecord>();
  private readonly meterPoints = new Map<string, MeterPointRecord>();
  private readonly meterValues = new Map<string, MeterValueRecord>();
  private readonly syncRuns = new Map<string, SyncRunRecord>();

  upsertDataConnection(
    input: UpsertDataConnectionInput
  ): Promise<DataConnectionRecord> {
    const existing = Array.from(this.connections.values()).find(
      (connection) =>
        connection.userId === input.userId &&
        connection.providerType === input.providerType &&
        connection.revokedAt === null
    );
    const now = new Date();
    const connection: DataConnectionRecord = {
      accessEndsAt: existing?.accessEndsAt ?? null,
      accessStartsAt: existing?.accessStartsAt ?? null,
      createdAt: existing?.createdAt ?? now,
      credentialKeyVersion: input.credentialKeyVersion,
      encryptedCredentials: input.encryptedCredentials,
      externalGrantId: existing?.externalGrantId ?? null,
      id: existing?.id ?? randomUUID(),
      lastErrorCode: input.lastErrorCode,
      lastSuccessfulSyncAt: existing?.lastSuccessfulSyncAt ?? null,
      lastSyncAt: existing?.lastSyncAt ?? null,
      metadata: input.metadata ?? {},
      providerType: input.providerType,
      revokedAt: null,
      status: input.status,
      updatedAt: now,
      userId: input.userId
    };

    this.connections.set(connection.id, connection);
    return Promise.resolve(connection);
  }

  updateConnectionSyncResult(
    connectionId: string,
    input: UpdateConnectionSyncResultInput
  ): Promise<DataConnectionRecord> {
    const connection = this.requireConnection(connectionId);
    const now = new Date();
    const updated: DataConnectionRecord = {
      ...connection,
      lastErrorCode: input.lastErrorCode,
      lastSuccessfulSyncAt: input.succeeded ? now : connection.lastSuccessfulSyncAt,
      lastSyncAt: now,
      status: input.status,
      updatedAt: now
    };

    this.connections.set(connectionId, updated);
    return Promise.resolve(updated);
  }

  upsertMeterPoint(
    connectionId: string,
    input: MeterPointDraft
  ): Promise<MeterPointRecord> {
    const existing = Array.from(this.meterPoints.values()).find(
      (meterPoint) =>
        meterPoint.connectionId === connectionId &&
        meterPoint.externalMeterPointId === input.externalMeterPointId
    );
    const now = new Date();
    const meterPoint: MeterPointRecord = {
      activeFrom: input.activeFrom,
      activeTo: input.activeTo,
      address: input.address,
      connectionId,
      consumptionType: input.consumptionType,
      createdAt: existing?.createdAt ?? now,
      externalMeterPointId: input.externalMeterPointId,
      gridOwner: input.gridOwner,
      id: existing?.id ?? randomUUID(),
      metadata: {},
      name: input.name,
      priceArea: input.priceArea,
      updatedAt: now
    };

    this.meterPoints.set(meterPoint.id, meterPoint);
    return Promise.resolve(meterPoint);
  }

  upsertMeterValues(
    meterPointId: string,
    values: MeterValueDraft[]
  ): Promise<MeterValueWriteStats> {
    let inserted = 0;
    let updated = 0;

    for (const value of values) {
      const key = meterValueKey(meterPointId, value);
      const existing = this.meterValues.get(key);
      const now = new Date();
      const record: MeterValueRecord = {
        direction: value.direction,
        intervalEnd: value.intervalEnd,
        intervalStart: value.intervalStart,
        meterPointId,
        quality: value.quality,
        receivedAt: existing?.receivedAt ?? now,
        sourceRevision: value.sourceRevision,
        updatedAt: now,
        valueKwh: value.valueKwh,
        verified: value.quality === "VERIFIED"
      };

      this.meterValues.set(key, record);

      if (existing) {
        updated += 1;
      } else {
        inserted += 1;
      }
    }

    return Promise.resolve({ inserted, received: values.length, updated });
  }

  createSyncRun(input: CreateSyncRunInput): Promise<SyncRunRecord> {
    const run: SyncRunRecord = {
      connectionId: input.connectionId,
      errorCode: null,
      errorMessageSanitized: null,
      finishedAt: null,
      id: randomUUID(),
      meterPointId: input.meterPointId ?? null,
      periodFrom: input.periodFrom,
      periodTo: input.periodTo,
      recordsInserted: 0,
      recordsReceived: 0,
      recordsUpdated: 0,
      startedAt: new Date(),
      status: input.status
    };

    this.syncRuns.set(run.id, run);
    return Promise.resolve(run);
  }

  finishSyncRun(id: string, input: FinishSyncRunInput): Promise<SyncRunRecord> {
    const run = this.syncRuns.get(id);

    if (!run) {
      throw new Error("Sync run was not found.");
    }

    const updated: SyncRunRecord = {
      ...run,
      errorCode: input.errorCode,
      errorMessageSanitized: input.errorMessageSanitized,
      finishedAt: new Date(),
      recordsInserted: input.recordsInserted,
      recordsReceived: input.recordsReceived,
      recordsUpdated: input.recordsUpdated,
      status: input.status
    };

    this.syncRuns.set(id, updated);
    return Promise.resolve(updated);
  }

  getDashboardSource(
    userId: string,
    period: DateRange
  ): Promise<DashboardSourceRecord | null> {
    const connection = Array.from(this.connections.values())
      .filter(
        (item) =>
          item.userId === userId &&
          item.providerType === "ELVIA_TOKEN" &&
          item.revokedAt === null
      )
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];

    if (!connection) {
      return Promise.resolve(null);
    }

    const meterPoint = Array.from(this.meterPoints.values()).find(
      (item) => item.connectionId === connection.id
    );

    if (!meterPoint) {
      return Promise.resolve(null);
    }

    const values = Array.from(this.meterValues.values())
      .filter(
        (value) =>
          value.meterPointId === meterPoint.id &&
          value.direction === "CONSUMPTION" &&
          value.intervalStart >= period.from &&
          value.intervalStart < period.to
      )
      .sort(
        (left, right) => left.intervalStart.getTime() - right.intervalStart.getTime()
      );

    return Promise.resolve({ connection, meterPoint, values });
  }

  private requireConnection(connectionId: string): DataConnectionRecord {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      throw new Error("Data connection was not found.");
    }

    return connection;
  }
}

function meterValueKey(meterPointId: string, value: MeterValueDraft): string {
  return [meterPointId, value.intervalStart.toISOString(), value.direction].join(":");
}
