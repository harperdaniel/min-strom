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

export function createMonthlyConsumption(
  values: MeterValueRecord[],
  now: Date
): DashboardSummaryResponse["monthly"] {
  const currentYear = now.getUTCFullYear();
  const lastYear = currentYear - 1;
  const currentMonth = now.getUTCMonth();
  const monthlyTotals = createMonthlyTotals(values);
  const trendFactor = calculateConsumptionTrendFactor(
    monthlyTotals,
    currentYear,
    currentMonth
  );

  return monthLabels.map((label, index) => {
    const thisYearTotal = getMonthTotal(monthlyTotals, currentYear, index);
    const lastYearTotal = getMonthTotal(monthlyTotals, lastYear, index);
    const hasThisYearData = hasMonthTotal(monthlyTotals, currentYear, index);
    const hasLastYearData = hasMonthTotal(monthlyTotals, lastYear, index);

    return {
      estimatedKwh: estimateMonthlyConsumption({
        currentMonth,
        currentYear,
        lastYearTotal,
        hasLastYearData,
        hasThisYearData,
        monthIndex: index,
        now,
        thisYearTotal,
        trendFactor,
        values
      }),
      label,
      lastYearKwh: hasLastYearData ? roundKwh(lastYearTotal) : null,
      month: index + 1,
      thisYearKwh: hasThisYearData ? roundKwh(thisYearTotal) : null
    };
  });
}

type MonthlyTotals = Map<string, number>;

function createMonthlyTotals(values: MeterValueRecord[]): MonthlyTotals {
  const totals: MonthlyTotals = new Map();

  for (const value of values) {
    const key = monthKey(
      value.intervalStart.getUTCFullYear(),
      value.intervalStart.getUTCMonth()
    );
    totals.set(key, (totals.get(key) ?? 0) + value.valueKwh);
  }

  return totals;
}

function calculateConsumptionTrendFactor(
  totals: MonthlyTotals,
  currentYear: number,
  currentMonth: number
): number {
  let weightedThisPeriod = 0;
  let weightedPreviousPeriod = 0;

  for (let offset = 1; offset <= 4; offset += 1) {
    const recentMonth = addUtcMonths(currentYear, currentMonth, -offset);
    const comparisonMonth = addUtcMonths(recentMonth.year, recentMonth.month, -12);
    const recentTotal = getMonthTotal(totals, recentMonth.year, recentMonth.month);
    const comparisonTotal = getMonthTotal(
      totals,
      comparisonMonth.year,
      comparisonMonth.month
    );

    if (recentTotal <= 0 || comparisonTotal <= 0) {
      continue;
    }

    const weight = 5 - offset;
    weightedThisPeriod += recentTotal * weight;
    weightedPreviousPeriod += comparisonTotal * weight;
  }

  if (weightedPreviousPeriod <= 0) {
    return 1;
  }

  return clamp(weightedThisPeriod / weightedPreviousPeriod, 0.65, 1.45);
}

function estimateMonthlyConsumption(input: {
  currentMonth: number;
  currentYear: number;
  hasLastYearData: boolean;
  hasThisYearData: boolean;
  lastYearTotal: number;
  monthIndex: number;
  now: Date;
  thisYearTotal: number;
  trendFactor: number;
  values: MeterValueRecord[];
}): number | null {
  if (input.monthIndex < input.currentMonth) {
    return null;
  }

  if (!input.hasLastYearData) {
    return input.monthIndex === input.currentMonth && input.hasThisYearData
      ? roundKwh(input.thisYearTotal)
      : null;
  }

  if (input.monthIndex === input.currentMonth) {
    const remainingLastYearKwh = calculateRemainingEquivalentMonthTotal(
      input.values,
      input.currentYear - 1,
      input.monthIndex,
      input.now
    );

    return roundKwh(input.thisYearTotal + remainingLastYearKwh * input.trendFactor);
  }

  return roundKwh(input.lastYearTotal * input.trendFactor);
}

function calculateRemainingEquivalentMonthTotal(
  values: MeterValueRecord[],
  year: number,
  month: number,
  now: Date
): number {
  return values
    .filter((value) => {
      const interval = value.intervalStart;

      return (
        interval.getUTCFullYear() === year &&
        interval.getUTCMonth() === month &&
        isAfterEquivalentMonthProgress(interval, now)
      );
    })
    .reduce((total, value) => total + value.valueKwh, 0);
}

function isAfterEquivalentMonthProgress(value: Date, now: Date): boolean {
  const valueDay = value.getUTCDate();
  const currentDay = Math.min(
    now.getUTCDate(),
    daysInUtcMonth(value.getUTCFullYear(), value.getUTCMonth())
  );

  if (valueDay !== currentDay) {
    return valueDay > currentDay;
  }

  if (value.getUTCHours() !== now.getUTCHours()) {
    return value.getUTCHours() > now.getUTCHours();
  }

  return value.getUTCMinutes() > now.getUTCMinutes();
}

function getMonthTotal(totals: MonthlyTotals, year: number, month: number): number {
  return totals.get(monthKey(year, month)) ?? 0;
}

function hasMonthTotal(totals: MonthlyTotals, year: number, month: number): boolean {
  return totals.has(monthKey(year, month));
}

function monthKey(year: number, month: number): string {
  return year + "-" + String(month + 1).padStart(2, "0");
}

function addUtcMonths(
  year: number,
  month: number,
  delta: number
): { month: number; year: number } {
  const date = new Date(Date.UTC(year, month + delta, 1));

  return {
    month: date.getUTCMonth(),
    year: date.getUTCFullYear()
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
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
