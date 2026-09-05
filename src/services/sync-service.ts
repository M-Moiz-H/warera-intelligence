import type { WarEraProvider } from "../warera/provider.js";
import { saveCountries } from "../database/repositories/countries.js";
import { saveRegions } from "../database/repositories/regions.js";
import { saveEvent } from "../database/repositories/events.js";

export async function syncCore(provider: WarEraProvider) {
  const result = { countries: 0, regions: 0, battles: 0, errors: [] as string[] };
  try { const rows = await provider.countries(); await saveCountries(rows); result.countries = rows.length; }
  catch (e) { result.errors.push(`countries: ${e instanceof Error ? e.message : String(e)}`); }
  try { const rows = await provider.regions(); await saveRegions(rows); result.regions = rows.length; }
  catch (e) { result.errors.push(`regions: ${e instanceof Error ? e.message : String(e)}`); }
  try { const rows = await provider.battles(); result.battles = rows.length; }
  catch (e) { result.errors.push(`battles: ${e instanceof Error ? e.message : String(e)}`); }
  if (result.errors.length) await saveEvent({ type: "sync_warning", severity: "watch", title: "WarEra sync completed with warnings", summary: result.errors.join(" | "), payload: result as any }).catch(() => undefined);
  return result;
}