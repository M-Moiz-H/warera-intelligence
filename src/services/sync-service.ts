import type { WarEraProvider } from "../warera/provider.js";
import { saveCountries } from "../database/repositories/countries.js";
import { saveRegions } from "../database/repositories/regions.js";
import { saveEvent } from "../database/repositories/events.js";

export async function syncCore(
  provider: WarEraProvider
) {
  const result = {
    countries: 0,
    regions: 0,
    battles: 0,
    errors: [] as string[]
  };

  try {
    const rows = await provider.countries();

    if (!Array.isArray(rows)) {
      throw new Error(
        "Country API returned an unexpected response."
      );
    }

    await saveCountries(rows);
    result.countries = rows.length;
  } catch (error) {
    result.errors.push(
      `countries: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }

  try {
    const rows = await provider.regions();

    if (!Array.isArray(rows)) {
      throw new Error(
        "Region API returned an unexpected response."
      );
    }

    await saveRegions(rows);
    result.regions = rows.length;
  } catch (error) {
    result.errors.push(
      `regions: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }

  try {
    const rows = await provider.battles({});

    if (!Array.isArray(rows)) {
      throw new Error(
        "Battle API returned an unexpected response."
      );
    }

    result.battles = rows.length;
  } catch (error) {
    result.errors.push(
      `battles: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }

  if (result.errors.length > 0) {
    await saveEvent({
      type: "sync_warning",
      severity: "watch",
      title: "WarEra sync completed with warnings",
      summary: result.errors.join(" | "),
      payload: result as any
    }).catch(() => undefined);
  }

  return result;
}
