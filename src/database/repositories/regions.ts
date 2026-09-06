import { supabase } from "../supabase.js";
import type { Region } from "../../types/models.js";

function normalizeJson(value: unknown): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function throwSupabaseError(
  operation: string,
  error: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  }
): never {
  const parts = [
    `Supabase ${operation} failed`,
    error.message ? `message=${error.message}` : "",
    error.code ? `code=${error.code}` : "",
    error.details ? `details=${error.details}` : "",
    error.hint ? `hint=${error.hint}` : ""
  ].filter(Boolean);

  throw new Error(parts.join(" | "));
}

export async function saveRegions(
  rows: Region[]
) {
  const now = new Date().toISOString();

  const data = rows
    .filter(
      (region) =>
        region.id &&
        region.name
    )
    .map((region) => ({
      id: String(region.id),
      name: String(region.name),
      country_id:
        region.countryId !== undefined &&
        region.countryId !== null
          ? String(region.countryId)
          : null,
      owner_country_id:
        region.ownerCountryId !== undefined &&
        region.ownerCountryId !== null
          ? String(region.ownerCountryId)
          : null,
      is_core: Boolean(region.isCore),
      resistance:
        region.resistance ?? null,
      raw: normalizeJson(region.raw),
      updated_at: now
    }));

  if (data.length === 0) {
    console.warn(
      "⚠️ No valid region rows available to save."
    );

    return;
  }

  const { error } = await supabase
    .from("regions")
    .upsert(data, {
      onConflict: "id"
    });

  if (error) {
    throwSupabaseError(
      "regions upsert",
      error
    );
  }
}

export async function pakistanOccupied(
  countryId: string
) {
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .eq("country_id", countryId)
    .eq("is_core", true)
    .neq("owner_country_id", countryId)
    .order("resistance", {
      ascending: false
    });

  if (error) {
    throwSupabaseError(
      "occupied-region lookup",
      error
    );
  }

  return data ?? [];
}
