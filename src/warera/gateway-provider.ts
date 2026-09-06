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

type JsonRecord = Record<string, any>;

const isRecord = (
  value: unknown
): value is JsonRecord =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value);

const object = (
  value: unknown
): JsonRecord =>
  isRecord(value) ? value : {};

const defined = <T>(
  ...values: (T | null | undefined)[]
): T | undefined =>
  values.find(
    (value) =>
      value !== null &&
      value !== undefined
  );

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

const pathValue = (
  value: unknown,
  path: string
): unknown => {
  let current: unknown = value;

  for (const key of path.split(".")) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }

    current = (current as JsonRecord)[key];
  }

  return current;
};

const firstPath = (
  value: unknown,
  paths: string[]
): unknown => {
  for (const path of paths) {
    const result = pathValue(
      value,
      path
    );

    if (
      result !== null &&
      result !== undefined
    ) {
      return result;
    }
  }

  return undefined;
};

const firstNumber = (
  value: unknown,
  paths: string[]
): number | undefined => {
  for (const path of paths) {
    const result = num(
      pathValue(value, path)
    );

    if (result !== undefined) {
      return result;
    }
  }

  return undefined;
};

const unwrapEntity = (
  value: unknown
): unknown => {
  let current = value;

  for (let depth = 0; depth < 6; depth += 1) {
    if (Array.isArray(current)) {
      const candidate = current.find(
        (entry) =>
          entry !== null &&
          entry !== undefined
      );

      if (candidate === undefined) {
        return {};
      }

      current = candidate;
      continue;
    }

    if (!isRecord(current)) {
      return current;
    }

    const raw = current;

    const directKeys = [
      "json",
      "result",
      "data",
      "battle",
      "currentBattle",
      "item"
    ];

    let changed = false;

    for (const key of directKeys) {
      const candidate = raw[key];

      if (
        candidate !== undefined &&
        candidate !== null &&
        (
          Array.isArray(candidate) ||
          isRecord(candidate)
        )
      ) {
        current = candidate;
        changed = true;
        break;
      }
    }

    if (!changed) {
      return current;
    }
  }

  return current;
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

    if (isRecord(candidate)) {
      return Object.values(candidate);
    }
  }

  return isRecord(value)
    ? Object.values(raw)
    : [];
};

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

    if (
      container.id ||
      container._id ||
      container.regionId ||
      container.name ||
      container.regionName
    ) {
      return [container];
    }

    const entries = Object.entries(container)
      .filter(
        ([, entry]) =>
          isRecord(entry)
      )
      .map(
        ([key, entry]) => {
          const region = object(entry);

          return region.id ||
            region._id ||
            region.regionId
            ? region
            : {
                ...region,
                id: key
              };
        }
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
    defined(
      raw.id,
      raw._id,
      raw.countryId,
      raw.regionId,
      raw.battleId
    ) ?? ""
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

  const result = defined(
    raw.id,
    raw._id,
    raw.countryId,
    raw.regionId,
    raw.battleId,
    raw.value
  );

  return result === undefined
    ? null
    : String(result);
};

const battleSideCountryId = (
  raw: JsonRecord,
  side: "attacker" | "defender"
): string | null => {
  const capitalized =
    side === "attacker"
      ? "Attacker"
      : "Defender";

  return (
    referenceId(
      raw[`${side}CountryId`]
    ) ??
    referenceId(
      raw[`${side}Country`]
    ) ??
    referenceId(
      raw[side]?.countryId
    ) ??
    referenceId(
      raw[side]?.country
    ) ??
    referenceId(
      raw[`${side}Side`]?.countryId
    ) ??
    referenceId(
      raw[`${side}Side`]?.country
    ) ??
    referenceId(
      raw.currentRound?.[
        `${side}CountryId`
      ]
    ) ??
    referenceId(
      raw.currentRound?.[
        `${side}Country`
      ]
    ) ??
    referenceId(
      raw.currentRound?.[side]?.countryId
    ) ??
    referenceId(
      raw.currentRound?.[side]?.country
    ) ??
    referenceId(
      raw[`${capitalized.toLowerCase()}Data`]
        ?.countryId
    )
  );
};

const battleSideDamage = (
  raw: JsonRecord,
  side: "attacker" | "defender"
): number | undefined => {
  const capitalized =
    side === "attacker"
      ? "Attacker"
      : "Defender";

  return firstNumber(raw, [
    `${side}Damage`,
    `${side}TotalDamage`,
    `${side}DamageDealt`,
    `${side}Side.damage`,
    `${side}Side.totalDamage`,
    `${side}.damage`,
    `${side}.totalDamage`,
    `${side}.damageDealt`,
    `${side}.totalDamageDealt`,
    `damage.${side}`,
    `damage.${side}Damage`,
    `damages.${side}`,
    `damages.${side}Damage`,
    `currentRound.${side}Damage`,
    `currentRound.${side}TotalDamage`,
    `currentRound.${side}.damage`,
    `currentRound.${side}.totalDamage`,
    `currentRound.${side}.damageDealt`,
    `round.${side}Damage`,
    `round.${side}.damage`,
    `round.${side}.totalDamage`,
    `live.${side}Damage`,
    `live.${side}.damage`,
    `live.${side}.totalDamage`,
    `battleData.${side}Damage`,
    `battleData.${side}.damage`,
    `${capitalized.toLowerCase()}Data.damage`,
    `${capitalized.toLowerCase()}Data.totalDamage`
  ]);
};

const battleStatus = (
  raw: JsonRecord
): string | null => {
  const value = firstPath(raw, [
    "status",
    "state",
    "battleStatus",
    "battleState",
    "phase",
    "currentRound.status",
    "currentRound.state",
    "round.status",
    "live.status"
  ]);

  return typeof value === "string" &&
    value.trim()
    ? value
    : null;
};

const battleRoundNumber = (
  raw: JsonRecord
): number | undefined =>
  firstNumber(raw, [
    "roundNumber",
    "currentRoundNumber",
    "currentRound.roundNumber",
    "currentRound.number",
    "round.roundNumber",
    "round.number",
    "battleRound.roundNumber",
    "battleRound.number"
  ]);

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
    const raw = object(
      unwrapEntity(value)
    );
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
          rankings.countryDamages?.rank ??
          rankings.weeklyCountryDamages?.rank
      ),

      economyRank: num(
        raw.economyRank ??
          rankings.countryWealth?.rank ??
          rankings.countryDevelopment?.rank
      ),

      raw
    };
  }

  private normalizeRegion(
    value: unknown
  ): Region {
    const raw = object(
      unwrapEntity(value)
    );
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

    const resistanceValue = firstNumber(
      raw,
      [
        "resistance",
        "resistancePercentage",
        "resistancePercent",
        "currentResistance"
      ]
    );

    const resistanceMax = firstNumber(
      raw,
      [
        "resistanceMax",
        "maxResistance"
      ]
    );

    const resistance =
      resistanceValue !== undefined &&
      resistanceMax !== undefined &&
      resistanceMax > 0
        ? Math.max(
            0,
            Math.min(
              100,
              (
                resistanceValue /
                resistanceMax
              ) * 100
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
    value: unknown,
    fallbackId = ""
  ): Battle {
    const raw = object(
      unwrapEntity(value)
    );

    const battleId =
      id(raw) ||
      fallbackId;

    const currentRound =
      raw.currentRound ??
      raw.round ??
      raw.battleRound ??
      raw.currentRoundId ??
      null;

    return {
      id: battleId,

      warId:
        referenceId(raw.warId) ??
        referenceId(raw.war) ??
        null,

      regionId:
        referenceId(raw.regionId) ??
        referenceId(raw.region) ??
        referenceId(raw.defenderRegion) ??
        referenceId(raw.currentRound?.regionId) ??
        null,

      attackerCountryId:
        battleSideCountryId(
          raw,
          "attacker"
        ),

      defenderCountryId:
        battleSideCountryId(
          raw,
          "defender"
        ),

      attackerDamage:
        battleSideDamage(
          raw,
          "attacker"
        ),

      defenderDamage:
        battleSideDamage(
          raw,
          "defender"
        ),

      currentRoundId:
        referenceId(currentRound),

      status:
        battleStatus(raw),

      endsAt:
        raw.endsAt ??
        raw.endDate ??
        raw.endTime ??
        raw.endAt ??
        null,

      raw
    };
  }

  private normalizeLiveBattle(
    battleId: string,
    value: unknown
  ): BattleLiveData {
    const raw = object(
      unwrapEntity(value)
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

      roundNumber:
        battleRoundNumber(raw),

      roundId:
        referenceId(
          raw.roundId
        ) ??
        referenceId(round),

      attackerDamage:
        battleSideDamage(
          raw,
          "attacker"
        ),

      defenderDamage:
        battleSideDamage(
          raw,
          "defender"
        ),

      attackerScore: firstNumber(
        raw,
        [
          "attackerScore",
          "attacker.score",
          "attacker.points",
          "currentRound.attackerScore",
          "currentRound.attacker.score",
          "currentRound.attacker.points"
        ]
      ),

      defenderScore: firstNumber(
        raw,
        [
          "defenderScore",
          "defender.score",
          "defender.points",
          "currentRound.defenderScore",
          "currentRound.defender.score",
          "currentRound.defender.points"
        ]
      ),

      status:
        battleStatus(raw),

      raw: {
        ...raw,
        round:
          roundObject
      }
    };
  }

  private normalizeRanking(
    value: unknown
  ): BattleRankingEntry {
    const raw = object(
      unwrapEntity(value)
    );

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

      value: firstNumber(
        raw,
        [
          "value",
          "damage",
          "points",
          "money"
        ]
      ),

      rank: firstNumber(
        raw,
        [
          "rank",
          "position"
        ]
      ),

      raw
    };
  }

  private normalizeBattleOrder(
    value: unknown
  ): BattleOrder {
    const raw = object(
      unwrapEntity(value)
    );

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

    return list(response)
      .map(
        (value) =>
          this.normalizeBattle(value)
      )
      .filter(
        (battle) =>
          Boolean(battle.id)
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
        response,
        battleId
      );
    } catch {
      return null;
    }
  }

  async liveBattleData(
    battleId: string,
    roundNumber?: number
  ): Promise<BattleLiveData | null> {
    const inputs: Record<
      string,
      unknown
    >[] = [];

    if (roundNumber !== undefined) {
      inputs.push({
        battleId,
        roundNumber
      });
    }

    inputs.push({ battleId });

    for (const input of inputs) {
      try {
        const response = await this.call(
          "battle.getLiveBattleData",
          input
        );

        return this.normalizeLiveBattle(
          battleId,
          response
        );
      } catch {
        // Try the next supported input shape.
      }
    }

    return null;
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

    
