import { type DateRange } from "@minstrom/domain";

export interface SyncWindowOptions {
  lastSuccessfulSyncAt: Date | null;
  now?: Date;
  overlapHours?: number;
}

export function createIncrementalSyncWindow(options: SyncWindowOptions): DateRange {
  const now = options.now ?? new Date();
  const overlapHours = options.overlapHours ?? 48;

  const from = options.lastSuccessfulSyncAt
    ? new Date(options.lastSuccessfulSyncAt)
    : new Date(now);

  if (options.lastSuccessfulSyncAt) {
    from.setUTCHours(from.getUTCHours() - overlapHours);
  } else {
    from.setUTCDate(from.getUTCDate() - 30);
  }

  return {
    from,
    to: now
  };
}
