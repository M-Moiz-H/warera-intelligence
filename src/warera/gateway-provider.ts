import { TrpcClient } from "./trpc-client.js";
import type { WarEraProvider } from "./provider.js";
import type { Battle, Country, Region } from "../types/models.js";
import { env } from "../config/env.js";

const object = (value: unknown): Record<string, any> =>
  value && typeof value === "object"
    ? (value as Record<string, any>)
    : {};

const list = (value: unknown): any[] => {
  if (Array.isArray(value)) {
    return value;
  }

  const raw = object(value);

  const candidates = [
    raw.items,
    raw.data,
    raw.countries,
    raw.regions,
    raw.battles
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      return Object.values(candidate);
    }
  }

  if (value && typeof value === "object") {
    return Object.values(raw);
  }

  return [];
};

const id = (value: any): string =>
  String(
    value?.id ??
      value?._id ??
      value?.countryId ??
      value?.regionId ??
      value?.battleId ??
      ""
  );

const num = (value: any): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const number = Number(value);

  return Number.isNaN(number) ? undefined : number;
};

export class GatewayProvider implements WarEraProvider {
  name = "WarEra API";

  private readonly clients: TrpcClient[];

  constructor() {
    const official = new TrpcClient(
      env.wareraApiBaseUrl,
      env.wareraApiKey
    );

    const clients = [official];

    if (
      env.wareraGatewayUrl &&
      env.wareraGatewayUrl !== env.wareraApiBaseUrl
    ) {
      clients.push(
        new TrpcClient(
          env.wareraGatewayUrl,
          env.wareraApiKey
        )
      );
    }

    this.clients = clients;
  }

  private async call<T>(
    procedure: string,
    input: unknown = {}
  ): Promise<T> {
    const errors: string[] = [];

    for (const client of this.clients) {
      try {
        return await client.get<T>(procedure, input ?? {});
      } catch (error) {
        errors.push(
          error instanceof Error
            ? error.message
            : String(error)
        );
      }
    }

    throw new Error(
      `${procedure} failed on all providers: ${errors.join(" | ")}`
    );
  }

  private normalizeCountry(value: any): Country {
    const raw = object(value);
    const countryId = id(raw);

    return {
      id: countryId,
      name: String(
        raw.name ??
          raw.countryName ??
          raw.title ??
          countryId
      ),
      code: raw.code ?? raw.isoCode,
      population: num(
        raw.population ?? raw.populationCount
      ),
      militaryRank: num(raw.militaryRank),
      economyRank: num(raw.economyRank),
      raw
    };
  }

  private normalizeRegion(value: any): Region {
    const raw = object(value);
    const regionId = id(raw);

    return {
      id: regionId,
      name: String(
        raw.name ??
          raw.regionName ??
          regionId
      ),
      countryId:
        raw.countryId ??
        raw.originalCountryId ??
        raw.coreCountryId ??
        null,
      ownerCountryId:
        raw.ownerCountryId ??
        raw.countryOwnerId ??
        raw.country?.id ??
        null,
      isCore: Boolean(
        raw.isCore ?? raw.core ?? false
      ),
      resistance: num(
        raw.resistance ??
          raw.resistancePercentage
      ),
      raw
    };
  }

  private normalizeBattle(value: any): Battle {
    const raw = object(value);
    const battleId = id(raw);

    return {
      id: battleId,
      warId: raw.warId ?? null,
      regionId:
        raw.regionId ??
        raw.region?.id ??
        null,
      attackerCountryId:
        raw.attackerCountryId ??
        raw.attacker?.countryId ??
        raw.attacker?.id ??
        null,
      defenderCountryId:
        raw.defenderCountryId ??
        raw.defender?.countryId ??
        raw.defender?.id ??
        null,
      attackerDamage: num(
        raw.attackerDamage ??
          raw.attacker?.damage
      ),
      defenderDamage: num(
        raw.defenderDamage ??
          raw.defender?.damage
      ),
      status:
        raw.status ??
        raw.state ??
        null,
      endsAt:
        raw.endsAt ??
        raw.endDate ??
        null,
      raw
    };
  }

  async healthCheck() {
    try {
      await this.call("country.getAllCountries", {});
      return true;
    } catch {
      return false;
    }
  }

  async countries() {
    const response = await this.call(
      "country.getAllCountries",
      {}
    );

    return list(response).map((value) =>
      this.normalizeCountry(value)
    );
  }

  async country(countryId: string) {
    try {
      const response = await this.call(
        "country.getCountryById",
        { countryId }
      );

      return this.normalizeCountry(response);
    } catch {
      return null;
    }
  }

  async regions() {
    const response = await this.call(
      "region.getRegionsObject",
      {}
    );

    return list(response).map((value) =>
      this.normalizeRegion(value)
    );
  }

  async region(regionId: string) {
    try {
      const response = await this.call(
        "region.getById",
        { regionId }
      );

      return this.normalizeRegion(response);
    } catch {
      return null;
    }
  }

  async battles(input: Record<string, unknown> = {}) {
    const response = await this.call(
      "battle.getBattles",
      input
    );

    return list(response).map((value) =>
      this.normalizeBattle(value)
    );
  }

  async events(input: Record<string, unknown> = {}) {
    return this.call(
      "event.getEventsPaginated",
      input
    );
  }

  async ranking(input: Record<string, unknown> = {}) {
    return this.call(
      "ranking.getRanking",
      input
    );
  }

  async militaryUnit(id: string) {
    return this.call(
      "mu.getById",
      { id }
    );
  }

  async party(id: string) {
    return this.call(
      "party.getById",
      { id }
    );
  }

  async user(id: string) {
    return this.call(
      "user.getUserLite",
      { id }
    );
  }

  async marketPrices(input: Record<string, unknown> = {}) {
    return this.call(
      "itemTrading.getPrices",
      input
    );
  }
}
