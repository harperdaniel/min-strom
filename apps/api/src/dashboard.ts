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
    monthly: createMonthlyConsumption(values, new Date()),
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

function createMonthlyConsumption(
  values: MeterValueRecord[],
  now: Date
): DashboardSummaryResponse["monthly"] {
  const currentYear = now.getUTCFullYear();
  const lastYear = currentYear - 1;
  const currentMonth = now.getUTCMonth();
  const thisYearTotals = Array.from({ length: 12 }, () => 0);
  const lastYearTotals = Array.from({ length: 12 }, () => 0);
  const thisYearHasData = Array.from({ length: 12 }, () => false);
  const lastYearHasData = Array.from({ length: 12 }, () => false);
  const currentYearDataDays = new Set<string>();

  for (const value of values) {
    const year = value.intervalStart.getUTCFullYear();
    const month = value.intervalStart.getUTCMonth();

    if (year === currentYear) {
      thisYearTotals[month] = (thisYearTotals[month] ?? 0) + value.valueKwh;
      thisYearHasData[month] = true;
      currentYearDataDays.add(formatOsloDate(value.intervalStart));
    }

    if (year === lastYear) {
      lastYearTotals[month] = (lastYearTotals[month] ?? 0) + value.valueKwh;
      lastYearHasData[month] = true;
    }
  }

  const thisYearTotal = thisYearTotals.reduce((total, value) => total + value, 0);
  const averageDailyKwh =
    currentYearDataDays.size > 0 ? thisYearTotal / currentYearDataDays.size : 0;

  return monthLabels.map((label, index) => ({
    estimatedKwh:
      averageDailyKwh > 0 && index >= currentMonth
        ? roundKwh(
            index === currentMonth
              ? (thisYearTotals[index] ?? 0)
              : averageDailyKwh * daysInUtcMonth(currentYear, index)
          )
        : null,
    label,
    lastYearKwh: lastYearHasData[index] ? roundKwh(lastYearTotals[index] ?? 0) : null,
    month: index + 1,
    thisYearKwh: thisYearHasData[index] ? roundKwh(thisYearTotals[index] ?? 0) : null
  }));
}

const monthLabels = [
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

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
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
