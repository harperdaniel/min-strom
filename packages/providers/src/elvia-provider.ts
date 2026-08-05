import {
  assertValidDateRange,
  type ConsumptionProvider,
  type CredentialValidationResult,
  type DateRange,
  type MeterPointDraft,
  type MeterValueDraft,
  type ProviderConnectionContext,
  type ProviderCredentials
} from "@minstrom/domain";

import { ProviderCredentialError, ProviderNotReadyError } from "./errors.js";

export interface ElviaProviderOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

type JsonRecord = Record<string, unknown>;

interface ElviaMeterValueResponse {
  meteringpoints: ElviaMeteringPoint[];
}

interface ElviaMeteringPoint {
  meteringPointId: string;
  customerContract: {
    startTime?: string;
    endTime?: string;
  } | null;
  metervalue: {
    fromHour?: string;
    toHour?: string;
    resolutionMinutes?: number;
    timeSeries: ElviaTimeSeriesValue[];
  } | null;
}

interface ElviaTimeSeriesValue {
  startTime: string;
  endTime: string;
  value: number;
  uom?: string;
  production?: boolean;
  verified?: boolean;
}

const defaultElviaApiBaseUrl = "https://elvia.azure-api.net";
const metervaluesPath = "/customer/metervalues/api/v1/metervalues";

export class ElviaProvider implements ConsumptionProvider {
  readonly type = "ELVIA_TOKEN";

  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ElviaProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? defaultElviaApiBaseUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async validateCredentials(
    credentials: ProviderCredentials
  ): Promise<CredentialValidationResult> {
    if (credentials.type !== "ELVIA_TOKEN") {
      return {
        valid: false,
        providerType: "ELVIA_TOKEN",
        errorCode: "WRONG_PROVIDER_TYPE",
        userMessage: "Dette er ikke en Elvia-token."
      };
    }

    try {
      await this.fetchMeterValues(credentials, createValidationPeriod(), []);

      return {
        valid: true,
        providerType: "ELVIA_TOKEN",
        userMessage: "Elvia-tokenet er gyldig."
      };
    } catch (error) {
      if (error instanceof ProviderCredentialError) {
        return {
          valid: false,
          providerType: "ELVIA_TOKEN",
          errorCode: "ELVIA_TOKEN_REJECTED",
          userMessage:
            "Elvia avviste tokenet. Sjekk at du kopierte hele tokenet fra Min side."
        };
      }

      throw error;
    }
  }

  async listMeterPoints(
    connection: ProviderConnectionContext
  ): Promise<MeterPointDraft[]> {
    const credentials = requireElviaCredentials(connection);
    const response = await this.fetchMeterValues(
      credentials,
      createValidationPeriod(),
      []
    );

    return response.meteringpoints.map((meteringPoint) => ({
      activeFrom: parseOptionalDate(meteringPoint.customerContract?.startTime),
      activeTo: parseOptionalDate(meteringPoint.customerContract?.endTime),
      address: null,
      consumptionType: "Forbruk",
      externalMeterPointId: meteringPoint.meteringPointId,
      gridOwner: "Elvia",
      name: formatMeterPointName(meteringPoint.meteringPointId),
      priceArea: null
    }));
  }

  async getMeterValues(
    connection: ProviderConnectionContext,
    meterPointId: string,
    period: DateRange
  ): Promise<MeterValueDraft[]> {
    const credentials = requireElviaCredentials(connection);
    const checkedPeriod = assertValidDateRange(period);
    const response = await this.fetchMeterValues(credentials, checkedPeriod, [
      meterPointId
    ]);
    const values: MeterValueDraft[] = [];

    for (const meteringPoint of response.meteringpoints) {
      if (meteringPoint.meteringPointId !== meterPointId) {
        continue;
      }

      for (const value of meteringPoint.metervalue?.timeSeries ?? []) {
        const intervalStart = parseRequiredDate(value.startTime, "startTime");
        const intervalEnd = parseRequiredDate(value.endTime, "endTime");

        values.push({
          direction: value.production === true ? "PRODUCTION" : "CONSUMPTION",
          intervalEnd,
          intervalStart,
          meterPointId,
          quality:
            value.verified === true
              ? "VERIFIED"
              : value.verified === false
                ? "PRELIMINARY"
                : "UNKNOWN",
          sourceRevision: "elvia-metervalues-v1",
          valueKwh: Number(value.value.toFixed(6))
        });
      }
    }

    return values;
  }

  private async fetchMeterValues(
    credentials: ProviderCredentials & { type: "ELVIA_TOKEN" },
    period: DateRange,
    meteringPointIds: string[]
  ): Promise<ElviaMeterValueResponse> {
    const url = new URL(metervaluesPath, this.baseUrl);
    url.searchParams.set("startTime", period.from.toISOString());
    url.searchParams.set("endTime", period.to.toISOString());
    url.searchParams.set("includeProduction", "true");

    if (meteringPointIds.length > 0) {
      url.searchParams.set("meteringPointIds", meteringPointIds.join(","));
    }

    const response = await this.fetchImpl(url, {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + credentials.token.trim()
      }
    });

    if (response.status === 401 || response.status === 403) {
      throw new ProviderCredentialError("Elvia rejected the supplied token.");
    }

    if (!response.ok) {
      throw new ProviderNotReadyError(
        "Elvia metervalue request failed with HTTP " + response.status + "."
      );
    }

    return parseElviaResponse(await readJson(response));
  }
}

function requireElviaCredentials(
  connection: ProviderConnectionContext
): ProviderCredentials & { type: "ELVIA_TOKEN" } {
  if (connection.credentials?.type !== "ELVIA_TOKEN") {
    throw new ProviderCredentialError("Elvia token credentials are missing.");
  }

  return connection.credentials;
}

function createValidationPeriod(now = new Date()): DateRange {
  const to = new Date(now);
  to.setUTCMinutes(0, 0, 0);

  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 2);

  return { from, to };
}

function formatMeterPointName(meteringPointId: string): string {
  const suffix =
    meteringPointId.length > 6 ? meteringPointId.slice(-6) : meteringPointId;
  return "Måler " + suffix;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.trim().length === 0) {
    return { meteringpoints: [] };
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ProviderNotReadyError("Elvia returned a non-JSON response.");
  }
}

function parseElviaResponse(input: unknown): ElviaMeterValueResponse {
  if (!isRecord(input)) {
    throw new ProviderNotReadyError("Elvia response was not an object.");
  }

  const rawMeteringPoints = input.meteringpoints;

  if (!Array.isArray(rawMeteringPoints)) {
    throw new ProviderNotReadyError("Elvia response did not include meteringpoints.");
  }

  return {
    meteringpoints: rawMeteringPoints.map(parseMeteringPoint)
  };
}

function parseMeteringPoint(input: unknown): ElviaMeteringPoint {
  if (!isRecord(input)) {
    throw new ProviderNotReadyError("Elvia metering point was not an object.");
  }

  const meteringPointId = readString(input.meteringPointId, "meteringPointId");
  const customerContract = isRecord(input.customerContract)
    ? {
        endTime: readOptionalString(input.customerContract.endTime),
        startTime: readOptionalString(input.customerContract.startTime)
      }
    : null;
  const metervalue = isRecord(input.metervalue)
    ? {
        fromHour: readOptionalString(input.metervalue.fromHour),
        resolutionMinutes: readOptionalNumber(input.metervalue.resolutionMinutes),
        timeSeries: Array.isArray(input.metervalue.timeSeries)
          ? input.metervalue.timeSeries.map(parseTimeSeriesValue)
          : [],
        toHour: readOptionalString(input.metervalue.toHour)
      }
    : null;

  return {
    customerContract,
    meteringPointId,
    metervalue
  };
}

function parseTimeSeriesValue(input: unknown): ElviaTimeSeriesValue {
  if (!isRecord(input)) {
    throw new ProviderNotReadyError("Elvia time series value was not an object.");
  }

  return {
    endTime: readString(input.endTime, "endTime"),
    production: readOptionalBoolean(input.production),
    startTime: readString(input.startTime, "startTime"),
    uom: readOptionalString(input.uom),
    value: readNumber(input.value, "value"),
    verified: readOptionalBoolean(input.verified)
  };
}

function parseOptionalDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRequiredDate(value: string, field: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ProviderNotReadyError("Elvia field " + field + " was not a date.");
  }

  return date;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProviderNotReadyError("Elvia field " + field + " was missing.");
  }

  return value;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ProviderNotReadyError("Elvia field " + field + " was not numeric.");
  }

  return value;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
