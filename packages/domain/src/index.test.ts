import { describe, expect, it } from "vitest";

import {
  assertValidDateRange,
  summarizeMeterValues,
  type MeterValue
} from "./index.js";

const baseValue: Omit<MeterValue, "intervalStart" | "intervalEnd" | "valueKwh"> = {
  direction: "CONSUMPTION",
  meterPointId: "meter-point-1",
  quality: "VERIFIED",
  receivedAt: new Date("2026-08-05T12:00:00.000Z"),
  sourceRevision: null,
  updatedAt: new Date("2026-08-05T12:00:00.000Z")
};

describe("summarizeMeterValues", () => {
  it("summarizes totals, period, and peak hour", () => {
    const summary = summarizeMeterValues([
      {
        ...baseValue,
        intervalStart: new Date("2026-08-05T00:00:00.000Z"),
        intervalEnd: new Date("2026-08-05T01:00:00.000Z"),
        valueKwh: 1.1234
      },
      {
        ...baseValue,
        intervalStart: new Date("2026-08-05T01:00:00.000Z"),
        intervalEnd: new Date("2026-08-05T02:00:00.000Z"),
        valueKwh: 2.5
      }
    ]);

    expect(summary.totalKwh).toBe(3.623);
    expect(summary.count).toBe(2);
    expect(summary.peak?.valueKwh).toBe(2.5);
  });
});

describe("assertValidDateRange", () => {
  it("rejects an inverted range", () => {
    expect(() =>
      assertValidDateRange({
        from: new Date("2026-08-05T02:00:00.000Z"),
        to: new Date("2026-08-05T01:00:00.000Z")
      })
    ).toThrow(/before/);
  });
});
