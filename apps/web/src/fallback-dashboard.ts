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
    monthly: createDemoMonthly(now),
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

function createDemoMonthly(now: Date): DashboardSummaryResponse["monthly"] {
  const currentMonth = now.getUTCMonth();
  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Des"
  ];
  const thisYear: Array<number | null> = [
    812,
    744,
    698,
    572,
    448,
    332,
    286,
    164,
    null,
    null,
    null,
    null
  ];
  const lastYear: Array<number | null> = [
    876, 801, 724, 611, 462, 351, 302, 276, 388, 516, 688, 834
  ];
  const estimate: Array<number | null> = [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    164,
    322,
    333,
    322,
    333
  ];

  return labels.map((label, index) => ({
    estimatedKwh: index >= currentMonth ? (estimate[index] ?? null) : null,
    label,
    lastYearKwh: lastYear[index] ?? null,
    month: index + 1,
    thisYearKwh: thisYear[index] ?? null
  }));
}
