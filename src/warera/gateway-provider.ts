import { TrpcClient } from "./trpc-client.js";
import type { WarEraProvider } from "./provider.js";
import type { Battle, Country, Region } from "../types/models.js";
import { env } from "../config/env.js";

const object = (x: unknown): Record<string, any> => (x && typeof x === "object" ? x as Record<string, any> : {});
const list = (x: unknown): any[] => Array.isArray(x) ? x : Object.values(object(x).items ?? object(x).data ?? object(x).countries ?? object(x).regions ?? object(x).battles ?? x ?? {});
const id = (x: any) => String(x?.id ?? x?._id ?? x?.countryId ?? x?.regionId ?? "");
const num = (x: any): number | undefined => x == null || Number.isNaN(Number(x)) ? undefined : Number(x);

export class GatewayProvider implements WarEraProvider {
  name = "WarEra API";
  private readonly clients = [
    new TrpcClient(env.wareraApiBaseUrl),
    ...(env.wareraGatewayUrl && env.wareraGatewayUrl !== env.wareraApiBaseUrl ? [new TrpcClient(env.wareraGatewayUrl)] : [])
  ];

  private async call<T>(procedure: string, input?: unknown): Promise<T> {
    const errors: string[] = [];
    for (const client of this.clients) {
      try { return await client.get<T>(procedure, input); }
      catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    }
    throw new Error(`${procedure} failed on all providers: ${errors.join(" | ")}`);
  }

  private normalizeCountry(x: any): Country {
    const raw = object(x); const countryId = id(raw);
    return { id: countryId, name: String(raw.name ?? raw.countryName ?? raw.title ?? countryId), code: raw.code ?? raw.isoCode, population: num(raw.population ?? raw.populationCount), militaryRank: num(raw.militaryRank), economyRank: num(raw.economyRank), raw };
  }
  private normalizeRegion(x: any): Region {
    const raw = object(x); const regionId = id(raw);
    return { id: regionId, name: String(raw.name ?? raw.regionName ?? regionId), countryId: raw.countryId ?? raw.originalCountryId ?? raw.coreCountryId ?? null, ownerCountryId: raw.ownerCountryId ?? raw.countryOwnerId ?? raw.country?.id ?? null, isCore: Boolean(raw.isCore ?? raw.core ?? false), resistance: num(raw.resistance ?? raw.resistancePercentage), raw };
  }
  private normalizeBattle(x: any): Battle {
    const raw = object(x); const battleId = id(raw);
    return { id: battleId, warId: raw.warId ?? null, regionId: raw.regionId ?? null, attackerCountryId: raw.attackerCountryId ?? raw.attacker?.countryId ?? null, defenderCountryId: raw.defenderCountryId ?? raw.defender?.countryId ?? null, attackerDamage: num(raw.attackerDamage ?? raw.attacker?.damage), defenderDamage: num(raw.defenderDamage ?? raw.defender?.damage), status: raw.status ?? raw.state ?? null, endsAt: raw.endsAt ?? raw.endDate ?? null, raw };
  }

  async healthCheck() { try { await this.call("country.getAllCountries"); return true; } catch { return false; } }
  async countries() { return list(await this.call("country.getAllCountries")).map((x) => this.normalizeCountry(x)); }
  async country(countryId: string) { try { return this.normalizeCountry(await this.call("country.getCountryById", { id: countryId })); } catch { return null; } }
  async regions() { return list(await this.call("region.getRegionsObject")).map((x) => this.normalizeRegion(x)); }
  async region(regionId: string) { try { return this.normalizeRegion(await this.call("region.getById", { id: regionId })); } catch { return null; } }
  async battles(input?: unknown) { return list(await this.call("battle.getBattles", input)).map((x) => this.normalizeBattle(x)); }
  async events(input?: unknown) { return this.call("event.getEventsPaginated", input); }
  async ranking(input?: unknown) { return this.call("ranking.getRanking", input); }
  async militaryUnit(id: string) { return this.call("mu.getById", { id }); }
  async party(id: string) { return this.call("party.getById", { id }); }
  async user(id: string) { return this.call("user.getUserLite", { id }); }
  async marketPrices(input?: unknown) { return this.call("itemTrading.getPrices", input); }
}