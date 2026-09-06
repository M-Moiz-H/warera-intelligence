import { supabase } from "../supabase.js";
import type { IntelEvent } from "../../types/models.js";

export async function saveEvent(event: IntelEvent): Promise<void> {
  const occurredAt = event.occurredAt
    ? new Date(event.occurredAt).toISOString()
    : new Date().toISOString();

  const { error } = await supabase
    .from("intelligence_events")
    .insert({
      event_type: event.type,
      severity: event.severity,
      country_id: event.countryId ?? null,
      region_id: event.regionId ?? null,
      title: event.title,
      summary: event.summary ?? null,
      payload: event.payload ?? {},
      occurred_at: occurredAt
    });

  if (error) {
    throw error;
  }
}
