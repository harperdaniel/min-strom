export class ProviderNotReadyError extends Error {
  readonly code = "PROVIDER_NOT_READY";

  constructor(message = "Provider integration must be verified before use.") {
    super(message);
    this.name = "ProviderNotReadyError";
  }
}

export class ProviderCredentialError extends Error {
  readonly code = "PROVIDER_CREDENTIAL_ERROR";

  constructor(message = "Provider credentials were rejected.") {
    super(message);
    this.name = "ProviderCredentialError";
  }
}
