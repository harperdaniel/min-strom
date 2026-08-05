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

export class MockConsumptionProvider implements ConsumptionProvider {
  readonly type = "MOCK";

  validateCredentials(
    credentials: ProviderCredentials
  ): Promise<CredentialValidationResult> {
    return Promise.resolve({
      valid: credentials.type === "MOCK",
      providerType: "MOCK",
      errorCode: credentials.type === "MOCK" ? undefined : "WRONG_PROVIDER_TYPE",
      userMessage:
        credentials.type === "MOCK"
          ? undefined
          : "Denne utviklingskoblingen kan bare brukes med mock-provideren."
    });
  }

  listMeterPoints(_connection: ProviderConnectionContext): Promise<MeterPointDraft[]> {
    void _connection;
    return Promise.resolve([
      {
        activeFrom: new Date("2026-01-01T00:00:00.000Z"),
        activeTo: null,
        address: "Demo-adresse",
        consumptionType: "Privatbolig",
        externalMeterPointId: "mock-meter-point",
        gridOwner: "Demo Nett",
        name: "Hjemme",
        priceArea: "NO1"
      }
    ]);
  }

  getMeterValues(
    _connection: ProviderConnectionContext,
    meterPointId: string,
    period: DateRange
  ): Promise<MeterValueDraft[]> {
    void _connection;

    assertValidDateRange(period);

    const values: MeterValueDraft[] = [];
    const cursor = new Date(period.from);

    while (cursor < period.to) {
      const intervalStart = new Date(cursor);
      const intervalEnd = new Date(cursor);
      intervalEnd.setUTCHours(intervalEnd.getUTCHours() + 1);

      const hour = intervalStart.getUTCHours();
      const morningPeak = hour >= 6 && hour <= 8 ? 1.2 : 0;
      const eveningPeak = hour >= 16 && hour <= 20 ? 1.6 : 0;
      const nightReduction = hour <= 4 ? -0.25 : 0;
      const baseline = 0.55;
      const wave = Math.sin((hour / 24) * Math.PI * 2) * 0.18;

      values.push({
        direction: "CONSUMPTION",
        intervalEnd,
        intervalStart,
        meterPointId,
        quality: hour < 8 ? "VERIFIED" : "PRELIMINARY",
        sourceRevision: "mock-v1",
        valueKwh: Number(
          Math.max(
            0.05,
            baseline + morningPeak + eveningPeak + nightReduction + wave
          ).toFixed(3)
        )
      });

      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }

    return Promise.resolve(values);
  }
}
