import { describe, expect, it } from "vitest";

import { ElviaProvider } from "./elvia-provider.js";

describe("ElviaProvider", () => {
  it("calls metervalues with bearer auth and maps meter values", async () => {
    const calls: Array<{ authorization: string | null; url: string }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      await Promise.resolve();

      const url = readUrl(input);
      const headers = new Headers(init?.headers);
      calls.push({
        authorization: headers.get("Authorization"),
        url
      });

      return new Response(
        JSON.stringify({
          meteringpoints: [
            {
              customerContract: {
                endTime: null,
                startTime: "2026-01-01T00:00:00Z"
              },
              meteringPointId: "707057500000000001",
              metervalue: {
                fromHour: "2026-08-04T00:00:00Z",
                resolutionMinutes: 60,
                timeSeries: [
                  {
                    endTime: "2026-08-04T01:00:00Z",
                    production: false,
                    startTime: "2026-08-04T00:00:00Z",
                    uom: "kWh",
                    value: 1.2345678,
                    verified: true
                  },
                  {
                    endTime: "2026-08-04T02:00:00Z",
                    production: true,
                    startTime: "2026-08-04T01:00:00Z",
                    uom: "kWh",
                    value: 0.4,
                    verified: false
                  }
                ],
                toHour: "2026-08-04T02:00:00Z"
              }
            }
          ]
        }),
        {
          headers: {
            "Content-Type": "application/json"
          },
          status: 200
        }
      );
    };
    const provider = new ElviaProvider({
      baseUrl: "https://elvia.example.test",
      fetchImpl
    });

    const values = await provider.getMeterValues(
      {
        connectionId: "connection-1",
        credentials: {
          token: "secret-token",
          type: "ELVIA_TOKEN"
        },
        providerType: "ELVIA_TOKEN",
        userId: "user-1"
      },
      "707057500000000001",
      {
        from: new Date("2026-08-04T00:00:00Z"),
        to: new Date("2026-08-05T00:00:00Z")
      }
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.authorization).toBe("Bearer secret-token");
    expect(calls[0]?.url).toContain(
      "https://elvia.example.test/customer/metervalues/api/v1/metervalues"
    );
    expect(
      new URL(calls[0]?.url ?? "https://missing.test").searchParams.get(
        "meteringPointIds"
      )
    ).toBe("707057500000000001");
    expect(values).toMatchObject([
      {
        direction: "CONSUMPTION",
        meterPointId: "707057500000000001",
        quality: "VERIFIED",
        valueKwh: 1.234568
      },
      {
        direction: "PRODUCTION",
        meterPointId: "707057500000000001",
        quality: "PRELIMINARY",
        valueKwh: 0.4
      }
    ]);
  });

  it("returns an invalid validation result when Elvia rejects the token", async () => {
    const provider = new ElviaProvider({
      fetchImpl: async () => {
        await Promise.resolve();

        return new Response("", { status: 401 });
      }
    });

    await expect(
      provider.validateCredentials({
        token: "bad-token",
        type: "ELVIA_TOKEN"
      })
    ).resolves.toMatchObject({
      errorCode: "ELVIA_TOKEN_REJECTED",
      providerType: "ELVIA_TOKEN",
      valid: false
    });
  });
});

function readUrl(input: Parameters<typeof fetch>[0]): string {
  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof input === "string") {
    return input;
  }

  return input.url;
}
