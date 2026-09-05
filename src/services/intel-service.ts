import type { WarEraProvider } from "../warera/provider.js";
import { findCountry } from "../database/repositories/countries.js";
import { pakistanOccupied } from "../database/repositories/regions.js";
import { powerScore } from "../intelligence/power-ranking.js";
import { momentum } from "../intelligence/momentum.js";

export async function liveCountry(provider: WarEraProvider, nameOrId: string) {
  const countries = await provider.countries();
  return countries.find(c => c.id === nameOrId || c.name.toLowerCase() === nameOrId.toLowerCase()) ?? null;
}

export async function pakistanIntel(provider: WarEraProvider) {
  const country = await liveCountry(provider, "Pakistan");
  if (!country) return null;
  const regions = await provider.regions();
  const cores = regions.filter(r => r.countryId === country.id && r.isCore);
  const occupied = cores.filter(r => r.ownerCountryId && r.ownerCountryId !== country.id);
  const resistance = occupied.length ? occupied.reduce((a, r) => a + Number(r.resistance ?? 0), 0) / occupied.length : 0;
  const battles = await provider.battles().catch(() => []);
  const active = battles.filter(b => b.attackerCountryId === country.id || b.defenderCountryId === country.id);
  return { country, cores, occupied, averageResistance: resistance, activeBattles: active };
}

export async function globalIntel(provider: WarEraProvider) {
  const countries = await provider.countries();
  const battles = await provider.battles().catch(() => []);
  const rankings = [...countries].map(c => ({ country: c, score: powerScore({ military: c.militaryRank ? Math.max(0, 100 - c.militaryRank) : 0, economy: c.economyRank ? Math.max(0, 100 - c.economyRank) : 0, population: c.population ? Math.log10(Math.max(1, c.population)) * 10 : 0 }) })).sort((a,b) => b.score-a.score);
  return { countries, battles, rankings };
}

export function battleAnalysis(b: any) {
  const a = Number(b.attackerDamage ?? 0), d = Number(b.defenderDamage ?? 0);
  const total = a + d;
  const leader = momentum(a, d);
  return { attackerDamage: a, defenderDamage: d, totalDamage: total, leader, attackerShare: total ? a / total * 100 : 50, defenderShare: total ? d / total * 100 : 50 };
}

export async function storedPakistanResistance() {
  const pakistan = await findCountry("Pakistan");
  if (!pakistan) return null;
  return { pakistan, regions: await pakistanOccupied(pakistan.id) };
}