import type { WarEraProvider } from "../warera/provider.js";
import { saveCountries } from "../database/repositories/countries.js";
import { saveRegions } from "../database/repositories/regions.js";
import { saveEvent } from "../database/repositories/events.js";

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;

    const parts: string[] = [];

    if (typeof value.message === "string") {
      parts.push(value.message);
    }

    if (typeof value.code === "string") {
      parts.push(`code=${value.code}`);
    }

    if (typeof value.details === "string") {
      parts.push(`details=${value.details}`);
    }

    if (typeof value.hint === "string") {
      parts.push(`hint=${value.hint}`);
    }

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "[unserializable error object]";
    }
  }

  return String(error);
}

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

    console.log(
      `🌍 Retrieved ${rows.length} countries from WarEra API.`
    );

    await saveCountries(rows);

    result.countries = rows.length;

    console.log(
      `💾 Successfully saved ${rows.length} countries.`
    );
  } catch (error) {
    const message = formatError(error);

    console.error(
      "❌ Country sync failed:",
      message
    );

    result.errors.push(`countries: ${message}`);
  }

  try {
    const rows = await provider.regions();

    if (!Array.isArray(rows)) {
      throw new Error(
        "Region API returned an unexpected response."
      );
    }

    console.log(
      `🗺️ Retrieved ${rows.length} regions from WarEra API.`
    );

    await saveRegions(rows);

    result.regions = rows.length;

    console.log(
      `💾 Successfully saved ${rows.length} regions.`
    );
  } catch (error) {
    const message = formatError(error);

    console.error(
      "❌ Region sync failed:",
      message
    );

    result.errors.push(`regions: ${message}`);
  }

  try {
    const rows = await provider.battles({});

    if (!Array.isArray(rows)) {
      throw new Error(
        "Battle API returned an unexpected response."
      );
    }

    result.battles = rows.length;

    console.log(
      `⚔️ Retrieved ${rows.length} battles from WarEra API.`
    );
  } catch (error) {
    const message = formatError(error);

    console.error(
      "❌ Battle sync failed:",
      message
    );

    result.errors.push(`battles: ${message}`);
  }

  if (result.errors.length > 0) {
    try {
      await saveEvent({
        type: "sync_warning",
        severity: "watch",
        title: "WarEra sync completed with warnings",
        summary: result.errors.join(" | "),
        payload: result
      });
    } catch (error) {
      console.error(
        "⚠️ Could not save sync warning:",
        formatError(error)
      );
    }
  }

  console.log("📊 WarEra sync result:", result);

  return result;
}
