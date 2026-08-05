import { type DashboardSummaryResponse } from "@minstrom/api-contract";
import { type DashboardSourceRecord, type MeterValueRecord } from "@minstrom/database";

const osloDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Oslo",
  year: "numeric"
});

export function createDashboardFromSource(
  source: DashboardSourceRecord
): DashboardSummaryResponse | null {
  const values = source.values
    .filter((value) => value.direction === "CONSUMPTION")
    .sort(
      (left, right) => left.intervalStart.getTime() - right.intervalStart.getTime()
    );

  if (values.length === 0) {
    return null;
  }

  const dailyTotals = createDailyTotals(values);
  const latestDay = dailyTotals[dailyTotals.length - 1];

  if (!latestDay) {
    return null;
  }

  const hourly = values
    .filter((value) => formatOsloDate(value.intervalStart) === latestDay.date)
    .map(toDashboardMeterValue);
  const visibleDaily = dailyTotals.slice(-7);
  const latestMonth = latestDay.date.slice(0, 7);
  const peak = values.reduce<MeterValueRecord | null>((current, value) => {
    if (!current || value.valueKwh > current.valueKwh) {
      return value;
    }

    return current;
  }, null);

  return {
    daily: visibleDaily,
    hourly,
    lastSuccessfulSyncAt:
      source.connection.lastSuccessfulSyncAt?.toISOString() ??
      source.connection.lastSyncAt?.toISOString() ??
      null,
    meterPoint: {
      address: source.meterPoint.address,
      connectionId: source.meterPoint.connectionId,
      consumptionType: source.meterPoint.consumptionType,
      gridOwner: source.meterPoint.gridOwner,
      id: source.meterPoint.id,
      name: source.meterPoint.name,
      priceArea: source.meterPoint.priceArea
    },
    peak: peak
      ? {
          intervalEnd: peak.intervalEnd.toISOString(),
          intervalStart: peak.intervalStart.toISOString(),
          valueKwh: roundKwh(peak.valueKwh)
        }
      : null,
    totals: {
      last7DaysKwh: roundKwh(
        visibleDaily.reduce((total, day) => total + day.valueKwh, 0)
      ),
      monthKwh: roundKwh(
        dailyTotals
          .filter((day) => day.date.startsWith(latestMonth))
          .reduce((total, day) => total + day.valueKwh, 0)
      ),
      todayKwh: latestDay.valueKwh
    }
  };
}

function createDailyTotals(
  values: MeterValueRecord[]
): DashboardSummaryResponse["daily"] {
  const byDate = new Map<string, number>();

  for (const value of values) {
    const date = formatOsloDate(value.intervalStart);
    byDate.set(date, (byDate.get(date) ?? 0) + value.valueKwh);
  }

  return Array.from(byDate.entries())
    .map(([date, valueKwh]) => ({
      date,
      valueKwh: roundKwh(valueKwh)
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function toDashboardMeterValue(
  value: MeterValueRecord
): DashboardSummaryResponse["hourly"][number] {
  return {
    direction: value.direction,
    intervalEnd: value.intervalEnd.toISOString(),
    intervalStart: value.intervalStart.toISOString(),
    quality: value.quality,
    valueKwh: roundKwh(value.valueKwh)
  };
}

function formatOsloDate(value: Date): string {
  return osloDateFormatter.format(value);
}

function roundKwh(value: number): number {
  return Number(value.toFixed(3));
}
