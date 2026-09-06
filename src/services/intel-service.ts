import type { WarEraProvider } from "../warera/provider.js";
import { findCountry } from "../database/repositories/countries.js";
import { pakistanOccupied } from "../database/repositories/regions.js";
import { powerScore } from "../intelligence/power-ranking.js";
import { momentum } from "../intelligence/momentum.js";

export async function liveCountry(
  provider: WarEraProvider,
  nameOrId: string
) {
  const countries = await provider.countries();

  return (
    countries.find(
      (country) =>
        country.id === nameOrId ||
        country.name.toLowerCase() === nameOrId.toLowerCase()
    ) ?? null
  );
}

function calculateThreatLevel(input: {
  occupiedCount: number;
  averageResistance: number;
  activeBattles: number;
}) {
  const { occupiedCount, averageResistance, activeBattles } = input;

  let score = 0;

  score += Math.min(40, occupiedCount * 8);
  score += Math.min(35, averageResistance * 0.35);
  score += Math.min(25, activeBattles * 5);

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

function calculateBattleStats(
  battles: any[],
  countryId: string
) {
  const attacking = battles.filter(
    (battle) =>
      battle.attackerCountryId === countryId
  );

  const defending = battles.filter(
    (battle) =>
      battle.defenderCountryId === countryId
  );

  const totalDamage = battles.reduce(
    (total, battle) =>
      total +
      Number(battle.attackerDamage ?? 0) +
      Number(battle.defenderDamage ?? 0),
    0
  );

  return {
    attackingCount: attacking.length,
    defendingCount: defending.length,
    totalDamage
  };
}

function topResistanceRegions(
  regions: any[],
  limit = 5
) {
  return [...regions]
    .sort(
      (a, b) =>
        Number(b.resistance ?? 0) -
        Number(a.resistance ?? 0)
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

  const regions = await provider.regions();

  const cores = regions.filter(
    (region) =>
      region.countryId === country.id &&
      region.isCore
  );

  const occupied = cores.filter(
    (region) =>
      region.ownerCountryId &&
      region.ownerCountryId !== country.id
  );

  const controlled = cores.filter(
    (region) =>
      !region.ownerCountryId ||
      region.ownerCountryId === country.id
  );

  const averageResistance =
    occupied.length > 0
      ? occupied.reduce(
          (total, region) =>
            total +
            Number(region.resistance ?? 0),
          0
        ) / occupied.length
      : 0;

  const battles = await provider
    .battles({})
    .catch(() => []);

  const activeBattles = battles.filter(
    (battle) =>
      battle.attackerCountryId === country.id ||
      battle.defenderCountryId === country.id
  );

  const battleStats = calculateBattleStats(
    activeBattles,
    country.id
  );

  const topResistance = topResistanceRegions(
    occupied
  );

  const controlPercentage =
    cores.length > 0
      ? (controlled.length / cores.length) * 100
      : 0;

  const threat = calculateThreatLevel({
    occupiedCount: occupied.length,
    averageResistance,
    activeBattles: activeBattles.length
  });

  return {
    country,

    territory: {
      totalCoreRegions: cores.length,
      controlledCoreRegions: controlled.length,
      occupiedCoreRegions: occupied.length,
      controlPercentage
    },

    resistance: {
      average: averageResistance,
      highest:
        topResistance.length > 0
          ? Number(
              topResistance[0].resistance ?? 0
            )
          : 0,
      regions: topResistance
    },

    battles: {
      active: activeBattles,
      attackingCount:
        battleStats.attackingCount,
      defendingCount:
        battleStats.defendingCount,
      totalDamage:
        battleStats.totalDamage
    },

    threat
  };
}

export async function globalIntel(
  provider: WarEraProvider
) {
  const countries = await provider.countries();

  const battles = await provider
    .battles({})
    .catch(() => []);

  const rankings = [...countries]
    .map((country) => ({
      country,
      score: powerScore({
        military: country.militaryRank
          ? Math.max(
              0,
              100 - country.militaryRank
            )
          : 0,

        economy: country.economyRank
          ? Math.max(
              0,
              100 - country.economyRank
            )
          : 0,

        population: country.population
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
        b.score - a.score
    );

  return {
    countries,
    battles,
    rankings
  };
}

export function battleAnalysis(
  battle: any
) {
  const attackerDamage = Number(
    battle.attackerDamage ?? 0
  );

  const defenderDamage = Number(
    battle.defenderDamage ?? 0
  );

  const totalDamage =
    attackerDamage + defenderDamage;

  const leader = momentum(
    attackerDamage,
    defenderDamage
  );

  return {
    attackerDamage,
    defenderDamage,
    totalDamage,
    leader,

    attackerShare:
      totalDamage > 0
        ? (attackerDamage / totalDamage) * 100
        : 50,

    defenderShare:
      totalDamage > 0
        ? (defenderDamage / totalDamage) * 100
        : 50
  };
}

export async function storedPakistanResistance() {
  const pakistan = await findCountry(
    "Pakistan"
  );

  if (!pakistan) {
    return null;
  }

  return {
    pakistan,

    regions: await pakistanOccupied(
      pakistan.id
    )
  };
}
