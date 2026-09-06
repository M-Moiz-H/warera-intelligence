import type {
  Battle,
  BattleLiveData,
  Country
} from "../types/models.js";
import type { WarEraProvider } from "../warera/provider.js";

import {
  findCountry
} from "../database/repositories/countries.js";

import {
  pakistanOccupied
} from "../database/repositories/regions.js";

import {
  powerScore
} from "../intelligence/power-ranking.js";

import {
  momentum
} from "../intelligence/momentum.js";

function asNumber(value: unknown): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : undefined;
}

function isUsableCountry(
  country: Country
): boolean {
  return Boolean(
    country.id &&
    country.name &&
    country.name !== country.id
  );
}

export async function liveCountry(
  provider: WarEraProvider,
  nameOrId: string
) {
  const query = nameOrId.trim().toLowerCase();

  const countries = await provider.countries();

  const exact = countries.find(
    (country) =>
      country.id.toLowerCase() === query ||
      country.name.toLowerCase() === query ||
      country.code?.toLowerCase() === query
  );

  if (exact && isUsableCountry(exact)) {
    return exact;
  }

  const partial = countries.find(
    (country) =>
      country.name
        .toLowerCase()
        .includes(query) ||
      query.includes(
        country.name.toLowerCase()
      )
  );

  return partial ?? null;
}

function calculateThreatLevel(input: {
  occupiedCount: number;
  averageResistance: number;
  activeBattles: number;
}) {
  const {
    occupiedCount,
    averageResistance,
    activeBattles
  } = input;

  let score = 0;

  score += Math.min(
    40,
    occupiedCount * 8
  );

  score += Math.min(
    35,
    averageResistance * 0.35
  );

  score += Math.min(
    25,
    activeBattles * 5
  );

  if (score >= 75) {
    return {
      score,
      level: "CRITICAL",
      emoji: "🚨"
    };
  }

  if (score >= 50) {
    return {
      score,
      level: "HIGH THREAT",
      emoji: "🔴"
    };
  }

  if (score >= 25) {
    return {
      score,
      level: "WATCH",
      emoji: "🟡"
    };
  }

  return {
    score,
    level: "STABLE",
    emoji: "🟢"
  };
}

export interface EnrichedBattle extends Battle {
  live?: BattleLiveData | null;
  dataSource: {
    detailLoaded: boolean;
    liveLoaded: boolean;
  };
}

function mergeBattleData(
  summary: Battle,
  detail: Battle | null,
  live: BattleLiveData | null
): EnrichedBattle {
  const best = detail ?? summary;

  return {
    ...summary,
    ...best,

    id:
      best.id ||
      summary.id,

    attackerCountryId:
      best.attackerCountryId ??
      summary.attackerCountryId ??
      null,

    defenderCountryId:
      best.defenderCountryId ??
      summary.defenderCountryId ??
      null,

    attackerDamage:
      live?.attackerDamage ??
      best.attackerDamage ??
      summary.attackerDamage,

    defenderDamage:
      live?.defenderDamage ??
      best.defenderDamage ??
      summary.defenderDamage,

    status:
      live?.status ??
      best.status ??
      summary.status ??
      null,

    currentRoundId:
      live?.roundId ??
      best.currentRoundId ??
      summary.currentRoundId ??
      null,

    raw: {
      ...(summary.raw ?? {}),
      ...(best.raw ?? {})
    },

    live,

    dataSource: {
      detailLoaded: detail !== null,
      liveLoaded: live !== null
    }
  };
}

/**
 * Gets battle summaries first, then enriches them with
 * battle.getById and live battle data.
 */
export async function enrichedBattles(
  provider: WarEraProvider,
  input: {
    battleId?: string;
    limit?: number;
  } = {}
): Promise<EnrichedBattle[]> {
  let summaries: Battle[] = [];

  if (input.battleId) {
    summaries = [
      {
        id: input.battleId
      }
    ];
  } else {
    summaries = await provider
      .battles({
        isActive: true,
        limit: input.limit ?? 10
      })
      .catch(() => []);

    if (!summaries.length) {
      summaries = await provider
        .battles({})
        .catch(() => []);
    }
  }

  const selected = summaries
    .filter((battle) => battle.id)
    .slice(
      0,
      input.limit ?? 10
    );

  const results = await Promise.all(
    selected.map(async (summary) => {
      const detail = await provider
        .battle(summary.id)
        .catch(() => null);

      const roundNumber =
        detail?.raw &&
        typeof detail.raw === "object"
          ? asNumber(
              (detail.raw as Record<
                string,
                unknown
              >).roundNumber
            )
          : undefined;

      const live = await provider
        .liveBattleData(
          summary.id,
          roundNumber
        )
        .catch(() => null);

      return mergeBattleData(
        summary,
        detail,
        live
      );
    })
  );

  return results;
}

export async function pakistanBattles(
  provider: WarEraProvider,
  countryId: string
): Promise<EnrichedBattle[]> {
  /*
   * First ask the API directly for country-related battles.
   * If the current API ignores that filter, fall back to
   * the enriched active battle list.
   */
  const direct = await provider
    .battles({
      isActive: true,
      countryId,
      limit: 20
    })
    .catch(() => []);

  const source =
    direct.length > 0
      ? direct
      : await enrichedBattles(provider, {
          limit: 20
        });

  const needsEnrichment = source.some(
    (battle) =>
      battle.attackerCountryId ===
        undefined &&
      battle.defenderCountryId ===
        undefined
  );

  const battles: EnrichedBattle[] =
    needsEnrichment ||
    source.some(
      (battle) =>
        !("dataSource" in battle)
    )
      ? await Promise.all(
          source
            .filter((battle) => battle.id)
            .map(async (summary) => {
              const detail =
                await provider
                  .battle(summary.id)
                  .catch(() => null);

              const live =
                await provider
                  .liveBattleData(
                    summary.id
                  )
                  .catch(() => null);

              return mergeBattleData(
                summary,
                detail,
                live
              );
            })
        )
      : source as EnrichedBattle[];

  return battles.filter(
    (battle) =>
      battle.attackerCountryId ===
        countryId ||
      battle.defenderCountryId ===
        countryId
  );
}

function calculateBattleStats(
  battles: EnrichedBattle[],
  countryId: string
) {
  const attacking = battles.filter(
    (battle) =>
      battle.attackerCountryId ===
        countryId
  );

  const defending = battles.filter(
    (battle) =>
      battle.defenderCountryId ===
        countryId
  );

  const damageDataCount =
    battles.filter(
      (battle) =>
        battle.attackerDamage !==
          undefined ||
        battle.defenderDamage !==
          undefined
    ).length;

  const totalDamage = battles.reduce(
    (total, battle) =>
      total +
      Number(
        battle.attackerDamage ?? 0
      ) +
      Number(
        battle.defenderDamage ?? 0
      ),
    0
  );

  return {
    attackingCount:
      attacking.length,

    defendingCount:
      defending.length,

    totalDamage,

    damageDataCount
  };
}

function topResistanceRegions(
  regions: any[],
  limit = 5
) {
  return [...regions]
    .sort(
      (a, b) =>
        Number(
          b.resistance ?? 0
        ) -
        Number(
          a.resistance ?? 0
        )
    )
    .slice(0, limit);
}

export async function pakistanIntel(
  provider: WarEraProvider
) {
  const country = await liveCountry(
    provider,
    "Pakistan"
  );

  if (!country) {
    return null;
  }

  const regions =
    await provider.regions();

  const cores = regions.filter(
    (region) =>
      region.countryId ===
        country.id &&
      region.isCore
  );

  const occupied = cores.filter(
    (region) =>
      region.ownerCountryId &&
      region.ownerCountryId !==
        country.id
  );

  const controlled = cores.filter(
    (region) =>
      !region.ownerCountryId ||
      region.ownerCountryId ===
        country.id
  );

  const averageResistance =
    occupied.length > 0
      ? occupied.reduce(
          (total, region) =>
            total +
            Number(
              region.resistance ?? 0
            ),
          0
        ) / occupied.length
      : 0;

  const activeBattles =
    await pakistanBattles(
      provider,
      country.id
    );

  const battleStats =
    calculateBattleStats(
      activeBattles,
      country.id
    );

  const topResistance =
    topResistanceRegions(
      occupied
    );

  const controlPercentage =
    cores.length > 0
      ? (
          controlled.length /
          cores.length
        ) * 100
      : 0;

  const threat =
    calculateThreatLevel({
      occupiedCount:
        occupied.length,
      averageResistance,
      activeBattles:
        activeBattles.length
    });

  return {
    country,

    territory: {
      totalCoreRegions:
        cores.length,

      controlledCoreRegions:
        controlled.length,

      occupiedCoreRegions:
        occupied.length,

      controlPercentage
    },

    resistance: {
      average:
        averageResistance,

      highest:
        topResistance.length > 0
          ? Number(
              topResistance[0]
                .resistance ?? 0
            )
          : 0,

      regions:
        topResistance
    },

    battles: {
      active:
        activeBattles,

      attackingCount:
        battleStats.attackingCount,

      defendingCount:
        battleStats.defendingCount,

      totalDamage:
        battleStats.totalDamage,

      damageDataCount:
        battleStats.damageDataCount
    },

    threat
  };
}

export async function globalIntel(
  provider: WarEraProvider
) {
  const countries =
    await provider.countries();

  const battles =
    await enrichedBattles(
      provider,
      { limit: 20 }
    );

  const rankings = [
    ...countries
  ]
    .map((country) => ({
      country,

      score: powerScore({
        military:
          country.militaryRank
            ? Math.max(
                0,
                100 -
                  country.militaryRank
              )
            : 0,

        economy:
          country.economyRank
            ? Math.max(
                0,
                100 -
                  country.economyRank
              )
            : 0,

        population:
          country.population
            ? Math.log10(
                Math.max(
                  1,
                  country.population
                )
              ) * 10
            : 0
      })
    }))
    .sort(
      (a, b) =>
        b.score -
        a.score
    );

  return {
    countries,
    battles,
    rankings
  };
}

export function battleAnalysis(
  battle: {
    attackerDamage?: number | null;
    defenderDamage?: number | null;
  }
) {
  const hasAttackerDamage =
    battle.attackerDamage !==
      null &&
    battle.attackerDamage !==
      undefined;

  const hasDefenderDamage =
    battle.defenderDamage !==
      null &&
    battle.defenderDamage !==
      undefined;

  const hasDamageData =
    hasAttackerDamage ||
    hasDefenderDamage;

  const attackerDamage =
    Number(
      battle.attackerDamage ?? 0
    );

  const defenderDamage =
    Number(
      battle.defenderDamage ?? 0
    );

  const totalDamage =
    attackerDamage +
    defenderDamage;

  const leader =
    momentum(
      attackerDamage,
      defenderDamage
    );

  return {
    attackerDamage,
    defenderDamage,
    totalDamage,
    leader,
    hasDamageData,
    hasAttackerDamage,
    hasDefenderDamage,

    attackerShare:
      totalDamage > 0
        ? (
            attackerDamage /
            totalDamage
          ) * 100
        : 50,

    defenderShare:
      totalDamage > 0
        ? (
            defenderDamage /
            totalDamage
          ) * 100
        : 50
  };
}

export async function storedPakistanResistance() {
  const pakistan =
    await findCountry(
      "Pakistan"
    );

  if (!pakistan) {
    return null;
  }

  return {
    pakistan,

    regions:
      await pakistanOccupied(
        pakistan.id
      )
  };
}
