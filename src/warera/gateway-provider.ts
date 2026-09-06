import { TrpcClient } from "./trpc-client.js";

import type {
  BattlesInput,
  WarEraProvider
} from "./provider.js";

import type {
  Battle,
  BattleLiveData,
  BattleOrder,
  BattleOrderSide,
  BattleRankingEntry,
  BattleRankingInput,
  Country,
  Region
} from "../types/models.js";

import { env } from "../config/env.js";

const object = (
  value: unknown
): Record<string, any> => {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, any>;
  }

  return {};
};

const list = (
  value: unknown
): any[] => {
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
    raw.battles,
    raw.rankings,
    raw.orders
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

/**
 * region.getRegionsObject may return a keyed object:
 *
 * {
 *   "region-id": { ...region data },
 *   "another-region-id": { ...region data }
 * }
 *
 * Preserve the object key as the region ID when the
 * individual region object does not contain its own ID.
 */
const regionEntries = (
  value: unknown
): any[] => {
  if (Array.isArray(value)) {
    return value;
  }

  const raw = object(value);

  const containers = [
    raw.regions,
    raw.regionsObject,
    raw.items,
    raw.data,
    raw.result,
    raw.results,
    raw.byId,
    value
  ];

  for (const candidate of containers) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    const container = object(candidate);

    if (Object.keys(container).length === 0) {
      continue;
    }

    // This is already a single region object.
    if (
      container.id ||
      container._id ||
      container.regionId ||
      container.name ||
      container.regionName
    ) {
      if (
        container.name ||
        container.regionName ||
        container.regionId ||
        container.country ||
        container.initialCountry
      ) {
        return [container];
      }
    }

    const entries = Object.entries(container)
      .filter(
        ([, entry]) =>
          entry &&
          typeof entry === "object" &&
          !Array.isArray(entry)
      )
      .map(
        ([key, entry]) => {
          const region = object(entry);

          if (
            !region.id &&
            !region._id &&
            !region.regionId
          ) {
            return {
              ...region,
              id: key
            };
          }

          return region;
        }
      )
      .filter(
        (entry) =>
          Object.keys(entry).length > 0
      );

    if (entries.length > 0) {
      return entries;
    }
  }

  return [];
};

const id = (
  value: unknown
): string => {
  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  const raw = object(value);

  return String(
    raw.id ??
      raw._id ??
      raw.countryId ??
      raw.regionId ??
      raw.battleId ??
      ""
  );
};

const referenceId = (
  value: unknown
): string | null => {
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
    return String(value);
  }

  const raw = object(value);

  const result =
    raw.id ??
    raw._id ??
    raw.countryId ??
    raw.regionId ??
    raw.battleId ??
    raw.value ??
    null;

  return result === null ||
    result === undefined
    ? null
    : String(result);
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
    const clients: TrpcClient[] = [
      new TrpcClient(
        env.wareraApiBaseUrl,
        env.wareraApiKey
      )
    ];

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
    const rankings = object(raw.rankings);

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

      population: num(
        raw.currentPopulation ??
          raw.population ??
          raw.populationCount
      ),

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
          )
      ),

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

    const originalCountryId =
      referenceId(raw.initialCountry) ??
      referenceId(raw.originalCountry) ??
      referenceId(raw.originalCountryId) ??
      referenceId(raw.coreCountry) ??
      referenceId(raw.coreCountryId) ??
      referenceId(raw.initialCountryId) ??
      null;

    const currentOwnerCountryId =
      referenceId(raw.country) ??
      referenceId(raw.currentCountry) ??
      referenceId(raw.ownerCountry) ??
      referenceId(raw.owner) ??
      referenceId(raw.ownerCountryId) ??
      referenceId(raw.countryOwnerId) ??
      referenceId(raw.currentCountryId) ??
      null;

    const resistanceValue = num(
      raw.resistance ??
        raw.resistancePercentage ??
        raw.resistancePercent ??
        raw.currentResistance
    );

    const resistanceMax = num(
      raw.resistanceMax ??
        raw.maxResistance
    );

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

      countryId:
        originalCountryId,

      ownerCountryId:
        currentOwnerCountryId,

      isCore:
        Boolean(originalCountryId) ||
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

    const attacker = object(
      raw.attacker
    );

    const defender = object(
      raw.defender
    );

    const currentRound =
      raw.currentRound ??
      raw.round ??
      raw.currentRoundId ??
      null;

    return {
      id: battleId,

      warId:
        referenceId(raw.warId) ??
        referenceId(raw.war),

      regionId:
        referenceId(raw.regionId) ??
        referenceId(raw.region) ??
        referenceId(raw.defenderRegion),

      attackerCountryId:
        referenceId(
          raw.attackerCountryId
        ) ??
        referenceId(
          attacker.countryId
        ) ??
        referenceId(
          attacker.country
        ),

      defenderCountryId:
        referenceId(
          raw.defenderCountryId
        ) ??
        referenceId(
          defender.countryId
        ) ??
        referenceId(
          defender.country
        ),

      attackerDamage: num(
        raw.attackerDamage ??
          attacker.damage ??
          attacker.totalDamage
      ),

      defenderDamage: num(
        raw.defenderDamage ??
          defender.damage ??
          defender.totalDamage
      ),

      currentRoundId:
        referenceId(currentRound),

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

  private normalizeLiveBattle(
    battleId: string,
    value: unknown
  ): BattleLiveData {
    const raw = object(value);

    const attacker = object(
      raw.attacker
    );

    const defender = object(
      raw.defender
    );

    const round =
      raw.round ??
      raw.currentRound ??
      raw.battleRound ??
      {};

    const roundObject = object(round);

    return {
      battleId:
        referenceId(
          raw.battleId
        ) ??
        referenceId(
          raw.battle
        ) ??
        battleId,

      roundNumber: num(
        raw.roundNumber ??
          roundObject.roundNumber ??
          roundObject.number
      ),

      roundId:
        referenceId(
          raw.roundId
        ) ??
        referenceId(round),

      attackerDamage: num(
        raw.attackerDamage ??
          attacker.damage ??
          attacker.totalDamage
      ),

      defenderDamage: num(
        raw.defenderDamage ??
          defender.damage ??
          defender.totalDamage
      ),

      attackerScore: num(
        raw.attackerScore ??
          attacker.score ??
          attacker.points
      ),

      defenderScore: num(
        raw.defenderScore ??
          defender.score ??
          defender.points
      ),

      status:
        raw.status ??
        raw.state ??
        null,

      raw
    };
  }

  private normalizeRanking(
    value: unknown
  ): BattleRankingEntry {
    const raw = object(value);

    return {
      id:
        referenceId(raw.id) ??
        undefined,

      entityId:
        referenceId(raw.entityId) ??
        referenceId(raw.countryId) ??
        referenceId(raw.userId) ??
        referenceId(raw.muId) ??
        undefined,

      name:
        typeof raw.name === "string"
          ? raw.name
          : typeof raw.username === "string"
            ? raw.username
            : undefined,

      value: num(
        raw.value ??
          raw.damage ??
          raw.points ??
          raw.money
      ),

      rank: num(
        raw.rank ??
          raw.position
      ),

      raw
    };
  }

  private normalizeBattleOrder(
    value: unknown
  ): BattleOrder {
    const raw = object(value);

    return {
      id:
        referenceId(raw.id) ??
        referenceId(raw.orderId) ??
        undefined,

      battleId:
        referenceId(raw.battleId) ??
        referenceId(raw.battle) ??
        undefined,

      side:
        typeof raw.side === "string"
          ? raw.side
          : undefined,

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

  async countries(): Promise<Country[]> {
    const response = await this.call(
      "country.getAllCountries",
      {}
    );

    return list(response).map(
      (value) =>
        this.normalizeCountry(value)
    );
  }

  async country(
    countryId: string
  ): Promise<Country | null> {
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

  async regions(): Promise<Region[]> {
    const response = await this.call(
      "region.getRegionsObject",
      {}
    );

    return regionEntries(response)
      .map(
        (value) =>
          this.normalizeRegion(value)
      )
      .filter(
        (region) =>
          Boolean(region.id)
      );
  }

  async region(
    regionId: string
  ): Promise<Region | null> {
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
    input: BattlesInput = {}
  ): Promise<Battle[]> {
    const response = await this.call(
      "battle.getBattles",
      input
    );

    return list(response).map(
      (value) =>
        this.normalizeBattle(value)
    );
  }

  async battle(
    battleId: string
  ): Promise<Battle | null> {
    try {
      const response = await this.call(
        "battle.getById",
        { battleId }
      );

      return this.normalizeBattle(
        response
      );
    } catch {
      return null;
    }
  }

  async liveBattleData(
    battleId: string,
    roundNumber?: number
  ): Promise<BattleLiveData | null> {
    try {
      const input: Record<
        string,
        unknown
      > = {
        battleId
      };

      if (
        roundNumber !== undefined
      ) {
        input.roundNumber =
          roundNumber;
      }

      const response = await this.call(
        "battle.getLiveBattleData",
        input
      );

      return this.normalizeLiveBattle(
        battleId,
        response
      );
    } catch {
      return null;
    }
  }

  async battleRanking(
    input: BattleRankingInput
  ): Promise<BattleRankingEntry[]> {
    const response = await this.call(
      "battleRanking.getRanking",
      input
    );

    return list(response).map(
      (value) =>
        this.normalizeRanking(value)
    );
  }

  async battleOrders(
    battleId: string,
    side: BattleOrderSide
  ): Promise<BattleOrder[]> {
    const response = await this.call(
      "battleOrder.getByBattle",
      {
        battleId,
        side
      }
    );

    return list(response).map(
      (value) =>
        this.normalizeBattleOrder(value)
    );
  }

  async events(
    input: Record<string, unknown> = {}
  ): Promise<unknown> {
    return this.call(
      "event.getEventsPaginated",
      input
    );
  }

  async ranking(
    input: Record<string, unknown> = {}
  ): Promise<unknown> {
    return this.call(
      "ranking.getRanking",
      input
    );
  }

  async militaryUnit(
    id: string
  ): Promise<unknown> {
    return this.call(
      "mu.getById",
      { id }
    );
  }

  async party(
    id: string
  ): Promise<unknown> {
    return this.call(
      "party.getById",
      { id }
    );
  }

  async user(
    id: string
  ): Promise<unknown> {
    return this.call(
      "user.getUserLite",
      { id }
    );
  }

  async marketPrices(
    input: Record<string, unknown> = {}
  ): Promise<unknown> {
    return this.call(
      "itemTrading.getPrices",
      input
    );
  }
}
