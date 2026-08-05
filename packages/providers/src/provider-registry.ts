import { type ConsumptionProvider, type ProviderType } from "@minstrom/domain";

import { ElviaProvider } from "./elvia-provider.js";
import { MockConsumptionProvider } from "./mock-provider.js";

export interface ProviderRegistryOptions {
  elviaBaseUrl?: string;
  elviaFetchImpl?: typeof fetch;
}

export interface ProviderRegistry {
  get(type: ProviderType): ConsumptionProvider;
  list(): ConsumptionProvider[];
}

export function createProviderRegistry(
  options: ProviderRegistryOptions = {}
): ProviderRegistry {
  const providers = new Map<ProviderType, ConsumptionProvider>([
    ["MOCK", new MockConsumptionProvider()],
    [
      "ELVIA_TOKEN",
      new ElviaProvider({
        baseUrl: options.elviaBaseUrl,
        fetchImpl: options.elviaFetchImpl
      })
    ]
  ]);

  return {
    get(type) {
      const provider = providers.get(type);

      if (!provider) {
        throw new Error(`Provider ${type} is not registered.`);
      }

      return provider;
    },
    list() {
      return Array.from(providers.values());
    }
  };
}
