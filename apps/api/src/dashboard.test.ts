import { type MeterValueRecord } from "@minstrom/database";
import { describe, expect, it } from "vitest";

import { createMonthlyConsumption } from "./dashboard.js";

const baseRecord = {
  direction: "CONSUMPTION" as const,
  meterPointId: "meter-1",
  quality: "VERIFIED" as const,
  receivedAt: new Date("2026-08-05T12:00:00.000Z"),
  sourceRevision: "test",
  updatedAt: new Date("2026-08-05T12:00:00.000Z"),
  verified: true
};

describe("dashboard monthly estimates", () => {
  it("uses last year's month scaled by the weighted last four completed months", () => {
    const monthly = createMonthlyConsumption(
      [
        value("2025-04-15T12:00:00.000Z", 100),
        value("2025-05-15T12:00:00.000Z", 100),
        value("2025-06-15T12:00:00.000Z", 100),
        value("2025-07-15T12:00:00.000Z", 100),
        value("2026-04-15T12:00:00.000Z", 120),
        value("2026-05-15T12:00:00.000Z", 120),
        value("2026-06-15T12:00:00.000Z", 120),
        value("2026-07-15T12:00:00.000Z", 120),
        value("2025-08-01T12:00:00.000Z", 30),
        value("2025-08-20T12:00:00.000Z", 70),
        value("2026-08-03T12:00:00.000Z", 50),
        value("2025-09-15T12:00:00.000Z", 200)
      ],
      new Date("2026-08-05T12:00:00.000Z")
    );

    expect(monthly[7]).toMatchObject({
      estimatedKwh: 134,
      lastYearKwh: 100,
      thisYearKwh: 50
    });
    expect(monthly[8]).toMatchObject({
      estimatedKwh: 240,
      lastYearKwh: 200,
      thisYearKwh: null
    });
  });
});

function value(intervalStart: string, valueKwh: number): MeterValueRecord {
  const start = new Date(intervalStart);
  const end = new Date(start);
  end.setUTCHours(end.getUTCHours() + 1);

  return {
    ...baseRecord,
    intervalEnd: end,
    intervalStart: start,
    valueKwh
  };
}
