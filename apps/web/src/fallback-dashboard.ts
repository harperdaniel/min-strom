import { type DashboardSummaryResponse } from "@minstrom/api-contract";

export function createFallbackDashboard(): DashboardSummaryResponse {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const hourly: DashboardSummaryResponse["hourly"] = Array.from(
    { length: 24 },
    (_, hour) => {
      const intervalStart = new Date(startOfDay);
      intervalStart.setUTCHours(hour);

      const intervalEnd = new Date(intervalStart);
      intervalEnd.setUTCHours(hour + 1);

      return {
        direction: "CONSUMPTION",
        intervalEnd: intervalEnd.toISOString(),
        intervalStart: intervalStart.toISOString(),
        quality: hour < 14 ? "VERIFIED" : "PRELIMINARY",
        valueKwh: Number((0.4 + (hour >= 16 && hour <= 20 ? 1.4 : 0.2)).toFixed(1))
      };
    }
  );

  const daily = [
    "2026-07-30",
    "2026-07-31",
    "2026-08-01",
    "2026-08-02",
    "2026-08-03",
    "2026-08-04",
    "2026-08-05"
  ].map((date, index) => ({
    date,
    valueKwh: [18.7, 19.3, 21.9, 17.8, 23.4, 24.1, 20.6][index] ?? 0
  }));

  return {
    daily,
    hourly,
    lastSuccessfulSyncAt: now.toISOString(),
    meterPoint: {
      address: null,
      connectionId: "fallback-connection",
      consumptionType: "Privatbolig",
      gridOwner: "Demo Nett",
      id: "fallback-meter-point",
      name: "Hjemme",
      priceArea: "NO1"
    },
    peak: {
      intervalEnd: hourly[18]?.intervalEnd ?? now.toISOString(),
      intervalStart: hourly[18]?.intervalStart ?? now.toISOString(),
      valueKwh: hourly[18]?.valueKwh ?? 0
    },
    totals: {
      last7DaysKwh: 145.8,
      monthKwh: 486.4,
      todayKwh: 20.6
    }
  };
}
