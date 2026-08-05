import { type DashboardSummaryResponse } from "@minstrom/api-contract";

function toIso(date: Date): string {
  return date.toISOString();
}

export function createDemoDashboard(now = new Date()): DashboardSummaryResponse {
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const hourly: DashboardSummaryResponse["hourly"] = Array.from(
    { length: 24 },
    (_, hour) => {
      const intervalStart = new Date(startOfDay);
      intervalStart.setUTCHours(hour);

      const intervalEnd = new Date(intervalStart);
      intervalEnd.setUTCHours(hour + 1);

      const morningPeak = hour >= 6 && hour <= 8 ? 1.1 : 0;
      const eveningPeak = hour >= 16 && hour <= 20 ? 1.5 : 0;
      const nightReduction = hour <= 4 ? -0.2 : 0;
      const valueKwh = Number(
        Math.max(
          0.05,
          0.55 + morningPeak + eveningPeak + nightReduction + Math.sin(hour) * 0.12
        ).toFixed(2)
      );

      return {
        direction: "CONSUMPTION",
        intervalEnd: toIso(intervalEnd),
        intervalStart: toIso(intervalStart),
        quality: hour < now.getUTCHours() - 2 ? "VERIFIED" : "PRELIMINARY",
        valueKwh
      };
    }
  );

  const peak = hourly.reduce<DashboardSummaryResponse["peak"]>((current, value) => {
    if (current === null || value.valueKwh > current.valueKwh) {
      return {
        intervalEnd: value.intervalEnd,
        intervalStart: value.intervalStart,
        valueKwh: value.valueKwh
      };
    }

    return current;
  }, null);

  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfDay);
    date.setUTCDate(date.getUTCDate() - (6 - index));

    return {
      date: date.toISOString().slice(0, 10),
      valueKwh: Number((18 + index * 1.6 + Math.sin(index * 1.7) * 2.1).toFixed(1))
    };
  });

  return {
    daily,
    hourly,
    lastSuccessfulSyncAt: toIso(now),
    meterPoint: {
      address: null,
      connectionId: "demo-connection",
      consumptionType: "Privatbolig",
      gridOwner: "Demo Nett",
      id: "demo-meter-point",
      name: "Hjemme",
      priceArea: "NO1"
    },
    peak,
    totals: {
      last7DaysKwh: Number(
        daily.reduce((total, day) => total + day.valueKwh, 0).toFixed(1)
      ),
      monthKwh: 486.4,
      todayKwh: Number(
        hourly.reduce((total, value) => total + value.valueKwh, 0).toFixed(1)
      )
    }
  };
}
