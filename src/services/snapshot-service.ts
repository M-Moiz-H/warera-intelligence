import { supabase } from "../database/supabase.js";
import type {
  Battle,
  Country,
  Region
} from "../types/models.js";
import type { WarEraProvider } from "../warera/provider.js";

type SnapshotResult = {
  countries: number;
  resistance: number;
  battles: number;
  marketPrices: number;
  errors: string[];
};

function asRows(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;

  if (raw && typeof raw === "object") {
    const value = raw as any;

    for (const candidate of [
      value.items,
      value.prices,
      value.data,
      value.result,
      value.results
    ]) {
      if (Array.isArray(candidate)) {
        return candidate;
      }

      if (candidate && typeof candidate === "object") {
        return Object.entries(candidate).map(
          ([key, row]) =>
            row && typeof row === "object"
              ? { code: key, ...(row as any) }
              : { code: key, price: row }
        );
      }
    }

    return Object.entries(value).map(
      ([key, row]) =>
        row && typeof row === "object"
          ? { code: key, ...(row as any) }
          : { code: key, price: row }
    );
  }

  return [];
}

function marketItemName(row: any): string {
  return String(
    row.name ??
      row.itemName ??
      row.itemCode ??
      row.code ??
      row.id ??
      "Unknown item"
  );
}

function marketPrice(row: any): number | null {
  const value =
    row.price ??
    row.currentPrice ??
    row.value ??
    row.amount ??
    row.averagePrice;

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const value = error as Record<
      string,
      unknown
    >;

    return String(
      value.message ??
        value.details ??
        JSON.stringify(error)
    );
  }

  return String(error);
}

async function saveCountrySnapshots(
  countries: Country[],
  capturedAt: string
): Promise<number> {
  const rows = countries
    .filter(
      (country) =>
        country.id &&
        country.name
    )
    .map((country) => ({
      country_id: String(country.id),
      population:
        country.population ?? null,
      military_rank:
        country.militaryRank ?? null,
      economy_rank:
        country.economyRank ?? null,
      captured_at: capturedAt
    }));

  if (rows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("country_snapshots")
    .insert(rows);

  if (error) {
    throw error;
  }

  return rows.length;
}

async function saveResistanceSnapshots(
  regions: Region[],
  capturedAt: string
): Promise<number> {
  const rows = regions
    .filter(
      (region) =>
        region.id &&
        region.resistance !== undefined &&
        region.resistance !== null
    )
    .map((region) => ({
      region_id: String(region.id),
      resistance: Number(region.resistance),
      owner_country_id:
        region.ownerCountryId
          ? String(region.ownerCountryId)
          : null,
      captured_at: capturedAt
    }));

  if (rows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("resistance_snapshots")
    .insert(rows);

  if (error) {
    throw error;
  }

  return rows.length;
}

async function saveBattlesAndSnapshots(
  battles: Battle[],
  capturedAt: string
): Promise<number> {
  const battleRows = battles
    .filter(
      (battle) => battle.id
    )
    .map((battle) => ({
      id: String(battle.id),
      war_id:
        battle.warId
          ? String(battle.warId)
          : null,
      region_id:
        battle.regionId
          ? String(battle.regionId)
          : null,
      attacker_country_id:
        battle.attackerCountryId
          ? String(
              battle.attackerCountryId
            )
          : null,
      defender_country_id:
        battle.defenderCountryId
          ? String(
              battle.defenderCountryId
            )
          : null,
      status: battle.status ?? null,
      attacker_damage:
        battle.attackerDamage ?? null,
      defender_damage:
        battle.defenderDamage ?? null,
      ends_at: battle.endsAt
        ? new Date(
            battle.endsAt
          ).toISOString()
        : null,
      raw: battle.raw ?? {},
      updated_at: capturedAt
    }));

  if (battleRows.length === 0) {
    return 0;
  }

  const { error: battleError } =
    await supabase
      .from("battles")
      .upsert(battleRows, {
        onConflict: "id"
      });

  if (battleError) {
    throw battleError;
  }

  const snapshotRows = battleRows.map(
    (battle) => ({
      battle_id: battle.id,
      attacker_damage:
        battle.attacker_damage,
      defender_damage:
        battle.defender_damage,
      captured_at: capturedAt
    })
  );

  const { error: snapshotError } =
    await supabase
      .from("battle_snapshots")
      .insert(snapshotRows);

  if (snapshotError) {
    throw snapshotError;
  }

  return snapshotRows.length;
}

async function saveMarketSnapshots(
  raw: unknown,
  capturedAt: string
): Promise<number> {
  const rows = asRows(raw)
    .map((row) => ({
      itemName: marketItemName(row),
      itemId: String(
        row.id ??
          row.itemId ??
          row.itemCode ??
          row.code ??
          marketItemName(row)
      ),
      price: marketPrice(row),
      currency:
        row.currency ??
        row.currencyCode ??
        null
    }))
    .filter(
      (row) =>
        row.price !== null
    )
    .map((row) => ({
      item_id: row.itemId,
      item_name: row.itemName,
      country_id: null,
      price: row.price,
      currency: row.currency,
      captured_at: capturedAt
    }));

  if (rows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("market_prices")
    .insert(rows);

  if (error) {
    throw error;
  }

  return rows.length;
}

export async function captureSnapshots(
  provider: WarEraProvider
): Promise<SnapshotResult> {
  const result: SnapshotResult = {
    countries: 0,
    resistance: 0,
    battles: 0,
    marketPrices: 0,
    errors: []
  };

  const capturedAt =
    new Date().toISOString();

  try {
    const countries =
      await provider.countries();

    result.countries =
      await saveCountrySnapshots(
        countries,
        capturedAt
      );

    console.log(
      `📸 Saved ${result.countries} country snapshots.`
    );
  } catch (error) {
    const message = formatError(error);

    console.error(
      "❌ Country snapshot failed:",
      message
    );

    result.errors.push(
      `countries: ${message}`
    );
  }

  try {
    const regions =
      await provider.regions();

    result.resistance =
      await saveResistanceSnapshots(
        regions,
        capturedAt
      );

    console.log(
      `📸 Saved ${result.resistance} resistance snapshots.`
    );
  } catch (error) {
    const message = formatError(error);

    console.error(
      "❌ Resistance snapshot failed:",
      message
    );

    result.errors.push(
      `resistance: ${message}`
    );
  }

  try {
    const battles =
      await provider.battles({});

    result.battles =
      await saveBattlesAndSnapshots(
        battles,
        capturedAt
      );

    console.log(
      `📸 Saved ${result.battles} battle snapshots.`
    );
  } catch (error) {
    const message = formatError(error);

    console.error(
      "❌ Battle snapshot failed:",
      message
    );

    result.errors.push(
      `battles: ${message}`
    );
  }

  try {
    const prices =
      await provider.marketPrices();

    result.marketPrices =
      await saveMarketSnapshots(
        prices,
        capturedAt
      );

    console.log(
      `📸 Saved ${result.marketPrices} market snapshots.`
    );
  } catch (error) {
    const message = formatError(error);

    console.error(
      "❌ Market snapshot failed:",
      message
    );

    result.errors.push(
      `market: ${message}`
    );
  }

  console.log(
    "📊 Historical snapshot result:",
    result
  );

  return result;
}
