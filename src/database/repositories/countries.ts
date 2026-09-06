import { supabase } from "../supabase.js";
import type { Country } from "../../types/models.js";

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

export async function saveCountries(
  rows: Country[]
) {
  const now = new Date().toISOString();

  const data = rows
    .filter(
      (country) =>
        country.id &&
        country.name
    )
    .map((country) => ({
      id: String(country.id),
      name: String(country.name),
      code:
        country.code !== undefined &&
        country.code !== null
          ? String(country.code)
          : null,
      population:
        country.population ?? null,
      military_rank:
        country.militaryRank ?? null,
      economy_rank:
        country.economyRank ?? null,
      raw: normalizeJson(country.raw),
      updated_at: now
    }));

  if (data.length === 0) {
    console.warn(
      "⚠️ No valid country rows available to save."
    );

    return;
  }

  const { error } = await supabase
    .from("countries")
    .upsert(data, {
      onConflict: "id"
    });

  if (error) {
    throwSupabaseError(
      "countries upsert",
      error
    );
  }
}

export async function findCountry(
  name: string
) {
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (error) {
    throwSupabaseError(
      "country lookup",
      error
    );
  }

  return data;
}
