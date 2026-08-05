import {
  type ConsumptionProvider,
  type CredentialValidationResult,
  type DateRange,
  type MeterPointDraft,
  type MeterValueDraft,
  type ProviderConnectionContext,
  type ProviderCredentials
} from "@minstrom/domain";

import { ProviderNotReadyError } from "./errors.js";

export interface ElviaProviderOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class ElviaProvider implements ConsumptionProvider {
  readonly type = "ELVIA_TOKEN";

  private readonly baseUrl?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ElviaProviderOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  validateCredentials(
    credentials: ProviderCredentials
  ): Promise<CredentialValidationResult> {
    if (credentials.type !== "ELVIA_TOKEN") {
      return Promise.resolve({
        valid: false,
        providerType: "ELVIA_TOKEN",
        errorCode: "WRONG_PROVIDER_TYPE",
        userMessage: "Dette er ikke en Elvia-token."
      });
    }

    if (!this.baseUrl) {
      return Promise.resolve({
        valid: false,
        providerType: "ELVIA_TOKEN",
        errorCode: "ELVIA_DATASPIKE_REQUIRED",
        userMessage:
          "Elvia-integrasjonen må verifiseres med faktiske API-kall før ekte tokens tas imot."
      });
    }

    void this.fetchImpl;

    return Promise.reject(
      new ProviderNotReadyError(
        "Elvia request shape, headers, limits, and error handling must be confirmed in the dataspike."
      )
    );
  }

  listMeterPoints(_connection: ProviderConnectionContext): Promise<MeterPointDraft[]> {
    void _connection;

    return Promise.reject(
      new ProviderNotReadyError("Elvia meter-point mapping is not implemented yet.")
    );
  }

  getMeterValues(
    _connection: ProviderConnectionContext,
    _meterPointId: string,
    _period: DateRange
  ): Promise<MeterValueDraft[]> {
    void _connection;
    void _meterPointId;
    void _period;

    return Promise.reject(
      new ProviderNotReadyError("Elvia metervalue mapping is not implemented yet.")
    );
  }
}
