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

function object(
  value: unknown
): Record<string, any> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, any>;
  }

  return {};
}

function list(
  value: unknown
): any[] {
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
  }

  return [];
}

function id(
  value: unknown
): string {
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
}

function referenceId(
  value: unknown
): string | null {
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

  if (
    result === null ||
    result === undefined
  ) {
    return null;
  }

  return String(result);
}

function num(
  value: unknown
): number | undefined {
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
}

function nested(
  value: unknown,
  ...keys: string[]
): unknown {
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
}

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
      referenceId(raw.originalCountryId) ??
      referenceId(raw.coreCountryId) ??
      referenceId(raw.initialCountryId) ??
      null;

    const currentOwnerCountryId =
      referenceId(raw.country) ??
      referenceId(raw.currentCountry) ??
      referenceId(raw.ownerCountryId) ??
      referenceId(raw.countryOwnerId) ??
      referenceId(raw.currentCountryId) ??
      null;

    const resistanceValue = num(
      raw.resistance ??
        raw.resistancePercentage
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
        Boolean(
          raw.isCore ??
            raw.core ??
            originalCountryId
        ),

      resistance,

      raw
    };
  }

  private normalizeBattle(
    value: unknown
  ): Battle {
    const raw = object(value);

    const battle = object(
      raw.battle
    );

    const source =
      Object.keys(battle).length > 0
        ? {
            ...raw,
            ...battle
          }
        : raw;

    const attacker = object(
      source.attacker ??
        source.attackerSide ??
        source.attackingSide
    );

    const defender = object(
      source.defender ??
        source.defenderSide ??
        source.defendingSide
    );

    const attackerStats = object(
      source.attackerStats ??
        attacker.stats
    );

    const defenderStats = object(
      source.defenderStats ??
        defender.stats
    );

    const battleId =
      id(source);

    return {
      id: battleId,

      warId:
        referenceId(
          source.warId
        ) ??
        referenceId(
          source.war
        ),

      regionId:
        referenceId(
          source.regionId
        ) ??
        referenceId(
          source.region
        ) ??
        referenceId(
          source.defenderRegion
        ) ??
        referenceId(
          source.regionObject
        ),

      attackerCountryId:
        referenceId(
          source.attackerCountryId
        ) ??
        referenceId(
          source.attackingCountryId
        ) ??
        referenceId(
          attacker.countryId
        ) ??
        referenceId(
          attacker.country
        ) ??
        referenceId(
          attacker.id
        ),

      defenderCountryId:
        referenceId(
          source.defenderCountryId
        ) ??
        referenceId(
          source.defendingCountryId
        ) ??
        referenceId(
          defender.countryId
        ) ??
        referenceId(
          defender.country
        ) ??
        referenceId(
          defender.id
        ),

      attackerDamage: num(
        source.attackerDamage ??
          source.attackingDamage ??
          source.attackerTotalDamage ??
          attacker.damage ??
          attacker.totalDamage ??
          attackerStats.damage ??
          attackerStats.totalDamage
      ),

      defenderDamage: num(
        source.defenderDamage ??
          source.defendingDamage ??
          source.defenderTotalDamage ??
          defender.damage ??
          defender.totalDamage ??
          defenderStats.damage ??
          defenderStats.totalDamage
      ),

      currentRoundId:
        referenceId(
          source.currentRoundId
        ) ??
        referenceId(
          source.currentRound
        ) ??
        referenceId(
          source.round
        ),

      status:
        source.status ??
        source.state ??
        source.battleStatus ??
        source.phase ??
        null,

      endsAt:
        source.endsAt ??
        source.endDate ??
        source.endTime ??
        source.endsAtDate ??
        null,

      raw: source
    };
  }

  private normalizeLiveBattle(
    battleId: string,
    value: unknown
  ): BattleLiveData {
    const raw = object(value);

    const live = object(
      raw.liveBattle ??
        raw.battle
    );

    const source =
      Object.keys(live).length > 0
        ? {
            ...raw,
            ...live
          }
        : raw;

    const attacker = object(
      source.attacker ??
        source.attackerSide ??
        source.attackingSide
    );

    const defender = object(
      source.defender ??
        source.defenderSide ??
        source.defendingSide
    );

    const attackerStats = object(
      source.attackerStats ??
        attacker.stats
    );

    const defenderStats = object(
      source.defenderStats ??
        defender.stats
    );

    const round = object(
      source.round ??
        source.currentRound ??
        source.battleRound
    );

    return {
      battleId:
        referenceId(
          source.battleId
        ) ??
        referenceId(
          source.battle
        ) ??
        battleId,

      roundNumber: num(
        source.roundNumber ??
          round.roundNumber ??
          round.number
      ),

      roundId:
        referenceId(
          source.roundId
        ) ??
        referenceId(round),

      attackerDamage: num(
        source.attackerDamage ??
          source.attackingDamage ??
          source.attackerTotalDamage ??
          attacker.damage ??
          attacker.totalDamage ??
          attackerStats.damage ??
          attackerStats.totalDamage
      ),

      defenderDamage: num(
        source.defenderDamage ??
          source.defendingDamage ??
          source.defenderTotalDamage ??
          defender.damage ??
          defender.totalDamage ??
          defenderStats.damage ??
          defenderStats.totalDamage
      ),

      attackerScore: num(
        source.attackerScore ??
          source.attackingScore ??
          attacker.score ??
          attacker.points ??
          attackerStats.score ??
          attackerStats.points
      ),

      defenderScore: num(
        source.defenderScore ??
          source.defendingScore ??
          defender.score ??
          defender.points ??
          defenderStats.score ??
          defenderStats.points
      ),

      status:
        source.status ??
        source.state ??
        source.phase ??
        null,

      raw: source
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

  async healthCheck(): Promise<boolean> {
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
        {
          countryId
        }
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

    return list(response).map(
      (value) =>
        this.normalizeRegion(value)
    );
  }

  async region(
    regionId: string
  ): Promise<Region | null> {
    try {
      const response = await this.call(
        "region.getById",
        {
          regionId
        }
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
        {
          battleId
        }
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
    input: Record<
      string,
      unknown
    > = {}
  ): Promise<unknown> {
    return this.call(
      "event.getEventsPaginated",
      input
    );
  }

  async ranking(
    input: Record<
      string,
      unknown
    > = {}
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
    input: Record<
      string,
      unknown
    > = {}
  ): Promise<unknown> {
    return this.call(
      "itemTrading.getPrices",
      input
    );
  }
}
