import { TrpcClient } from "./trpc-client.js";
import type { WarEraProvider } from "./provider.js";
import type {
  Battle,
  Country,
  Region
} from "../types/models.js";
import { env } from "../config/env.js";

const object = (value: unknown): Record<string, any> =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value)
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
    raw.result,
    raw.results,
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

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return Object.values(raw);
  }

  return [];
};

const id = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  const raw = object(value);

  return String(
    raw.id ??
      raw._id ??
      raw.countryId ??
      raw.regionId ??
      raw.battleId ??
      raw.country ??
      raw.region ??
      raw.battle ??
      ""
  );
};

const referenceId = (value: unknown): string | null => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const result = String(value);

    return result.length > 0
      ? result
      : null;
  }

  const raw = object(value);

  const result =
    raw.id ??
    raw._id ??
    raw.countryId ??
    raw.regionId ??
    raw.value ??
    null;

  if (
    result === null ||
    result === undefined
  ) {
    return null;
  }

  return String(result);
};

const num = (
  value: unknown
): number | undefined => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
};

const nested = (
  value: unknown,
  ...keys: string[]
): unknown => {
  let current: any = value;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }

    current = current[key];
  }

  return current;
};

export class GatewayProvider
  implements WarEraProvider
{
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
      env.wareraGatewayUrl !==
        env.wareraApiBaseUrl
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
        return await client.get<T>(
          procedure,
          input ?? {}
        );
      } catch (error) {
        errors.push(
          error instanceof Error
            ? error.message
            : String(error)
        );
      }
    }

    throw new Error(
      `${procedure} failed on all providers: ${errors.join(
        " | "
      )}`
    );
  }

  private normalizeCountry(
    value: unknown
  ): Country {
    const raw = object(value);
    const countryId = id(raw);

    const rankings = object(
      raw.rankings
    );

    return {
      id: countryId,

      name: String(
        raw.name ??
          raw.countryName ??
          raw.title ??
          countryId
      ),

      code:
        raw.code ??
        raw.isoCode ??
        raw.countryCode ??
        undefined,

      /*
       * WarEra country responses use
       * currentPopulation rather than the
       * older generic population field.
       */
      population: num(
        raw.currentPopulation ??
          raw.population ??
          raw.populationCount
      ),

      /*
       * Prefer an explicit military rank.
       * If unavailable, use the available
       * WarEra damage ranking.
       */
      militaryRank: num(
        raw.militaryRank ??
          nested(
            rankings,
            "countryDamages",
            "rank"
          ) ??
          nested(
            rankings,
            "weeklyCountryDamages",
            "rank"
          ) ??
          nested(
            rankings,
            "military",
            "rank"
          )
      ),

      /*
       * Prefer an explicit economy rank.
       * Otherwise use the closest available
       * economic/development ranking.
       */
      economyRank: num(
        raw.economyRank ??
          nested(
            rankings,
            "countryWealth",
            "rank"
          ) ??
          nested(
            rankings,
            "countryDevelopment",
            "rank"
          ) ??
          nested(
            rankings,
            "economy",
            "rank"
          )
      ),

      raw
    };
  }

  private normalizeRegion(
    value: unknown
  ): Region {
    const raw = object(value);
    const regionId = id(raw);

    /*
     * initialCountry = the original country
     * this region belongs to.
     *
     * country = the country currently
     * controlling the region.
     *
     * Both may be IDs directly or nested
     * objects depending on the API response.
     */
    const originalCountryId =
      referenceId(
        raw.initialCountry
      ) ??
      referenceId(
        raw.originalCountryId
      ) ??
      referenceId(
        raw.coreCountryId
      ) ??
      referenceId(
        raw.initialCountryId
      ) ??
      null;

    const currentOwnerCountryId =
      referenceId(
        raw.country
      ) ??
      referenceId(
        raw.currentCountry
      ) ??
      referenceId(
        raw.ownerCountryId
      ) ??
      referenceId(
        raw.countryOwnerId
      ) ??
      referenceId(
        raw.currentCountryId
      ) ??
      null;

    const resistanceValue = num(
      raw.resistance ??
        raw.resistancePercentage
    );

    const resistanceMax = num(
      raw.resistanceMax ??
        raw.maxResistance
    );

    /*
     * The live WarEra data may provide
     * resistance as points, e.g.
     *
     * resistance: 3638
     * resistanceMax: 3640
     *
     * Convert this into a percentage for
     * the intelligence system.
     */
    const resistance =
      resistanceValue !== undefined &&
      resistanceMax !== undefined &&
      resistanceMax > 0
        ? Math.max(
            0,
            Math.min(
              100,
              (resistanceValue /
                resistanceMax) *
                100
            )
          )
        : resistanceValue;

    return {
      id: regionId,

      name: String(
        raw.name ??
          raw.regionName ??
          raw.title ??
          regionId
      ),

      /*
       * countryId represents the original /
       * core country of the region.
       */
      countryId: originalCountryId,

      /*
       * ownerCountryId represents the
       * current controller.
       */
      ownerCountryId:
        currentOwnerCountryId,

      /*
       * A region with an initial/core
       * country is treated as a core region
       * for that country.
       */
      isCore:
        Boolean(
          originalCountryId
        ) ||
        Boolean(
          raw.isCore ??
            raw.core ??
            false
        ),

      resistance,

      raw
    };
  }

  private normalizeBattle(
    value: unknown
  ): Battle {
    const raw = object(value);
    const battleId = id(raw);

    return {
      id: battleId,

      warId:
        referenceId(
          raw.warId
        ) ??
        referenceId(
          raw.war
        ),

      regionId:
        referenceId(
          raw.regionId
        ) ??
        referenceId(
          raw.region
        ),

      attackerCountryId:
        referenceId(
          raw.attackerCountryId
        ) ??
        referenceId(
          raw.attacker?.countryId
        ) ??
        referenceId(
          raw.attacker?.country
        ) ??
        referenceId(
          raw.attacker
        ),

      defenderCountryId:
        referenceId(
          raw.defenderCountryId
        ) ??
        referenceId(
          raw.defender?.countryId
        ) ??
        referenceId(
          raw.defender?.country
        ) ??
        referenceId(
          raw.defender
        ),

      attackerDamage: num(
        raw.attackerDamage ??
          raw.attacker?.damage ??
          raw.attacker?.totalDamage
      ),

      defenderDamage: num(
        raw.defenderDamage ??
          raw.defender?.damage ??
          raw.defender?.totalDamage
      ),

      status:
        raw.status ??
        raw.state ??
        raw.battleStatus ??
        null,

      endsAt:
        raw.endsAt ??
        raw.endDate ??
        raw.endTime ??
        null,

      raw
    };
  }

  async healthCheck() {
    try {
      await this.call(
        "country.getAllCountries",
        {}
      );

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

    return list(response).map(
      (value) =>
        this.normalizeCountry(value)
    );
  }

  async country(countryId: string) {
    try {
      const response = await this.call(
        "country.getCountryById",
        { countryId }
      );

      return this.normalizeCountry(
        response
      );
    } catch {
      return null;
    }
  }

  async regions() {
    const response = await this.call(
      "region.getRegionsObject",
      {}
    );

    return list(response).map(
      (value) =>
        this.normalizeRegion(value)
    );
  }

  async region(regionId: string) {
    try {
      const response = await this.call(
        "region.getById",
        { regionId }
      );

      return this.normalizeRegion(
        response
      );
    } catch {
      return null;
    }
  }

  async battles(
    input: Record<string, unknown> = {}
  ) {
    const response = await this.call(
      "battle.getBattles",
      input
    );

    return list(response).map(
      (value) =>
        this.normalizeBattle(value)
    );
  }

  async events(
    input: Record<string, unknown> = {}
  ) {
    return this.call(
      "event.getEventsPaginated",
      input
    );
  }

  async ranking(
    input: Record<string, unknown> = {}
  ) {
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

  async marketPrices(
    input: Record<string, unknown> = {}
  ) {
    return this.call(
      "itemTrading.getPrices",
      input
    );
  }
}
