import type {
  IntelEvent,
  Region
} from "../types/models.js";

export function detectRegionChange(
  previous: Region | undefined,
  current: Region
): IntelEvent[] {
  const events: IntelEvent[] = [];

  if (!previous) {
    return events;
  }

  if (previous.ownerCountryId !== current.ownerCountryId) {
    events.push({
      type: "region_owner_changed",
      severity: "high",
      regionId: current.id,
      countryId: current.ownerCountryId ?? current.countryId ?? null,
      title: `Control changed: ${current.name}`,
      summary: "Region ownership changed in tracked data.",
      payload: {
        previousOwnerCountryId:
          previous.ownerCountryId ?? null,
        currentOwnerCountryId:
          current.ownerCountryId ?? null,
        regionName: current.name
      }
    });
  }

  if (previous.resistance !== current.resistance) {
    events.push({
      type: "resistance_changed",
      severity: "watch",
      regionId: current.id,
      countryId: current.countryId ?? null,
      title: `Resistance changed: ${current.name}`,
      summary:
        `${previous.resistance ?? 0}% → ` +
        `${current.resistance ?? 0}%`,
      payload: {
        previousResistance:
          previous.resistance ?? 0,
        currentResistance:
          current.resistance ?? 0,
        regionName: current.name
      }
    });
  }

  return events;
}
