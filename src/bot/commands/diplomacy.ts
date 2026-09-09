import { SlashCommandBuilder } from "discord.js";
import { embed, text } from "./_utils.js";

const DIPLOMATIC_EVENTS = [
  "warDeclared",
  "peace_agreement",
  "peaceMade",
  "allianceFormed",
  "allianceBroken"
];

function asList(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];

  const value = raw as any;

  for (const candidate of [
    value.items,
    value.events,
    value.data,
    value.result,
    value.results
  ]) {
    if (Array.isArray(candidate)) return candidate;

    if (candidate && typeof candidate === "object") {
      return Object.values(candidate);
    }
  }

  return [];
}

function objects(event: any): any[] {
  return [
    event,
    event?.data,
    event?.payload,
    event?.meta,
    event?.content,
    event?.attributes,
    event?.details,
    event?.eventData
  ].filter((value) => value && typeof value === "object");
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function eventType(event: any): string | null {
  for (const value of objects(event)) {
    const found = firstText(
      value.eventType,
      value.type,
      value.event,
      value.kind,
      value.action,
      value.category,
      value.eventName,
      value.typeName,
      value.name
    );

    if (found) return found;
  }

  return null;
}

function eventDateValue(event: any): Date | null {
  for (const value of objects(event)) {
    const raw = firstText(
      value.createdAt,
      value.date,
      value.timestamp,
      value.occurredAt,
      value.updatedAt,
      value.time
    );

    if (!raw) continue;

    const date = new Date(raw);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function compactTime(date: Date | null): string {
  if (!date) return "";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  if (days < 30) {
    return `${Math.floor(days / 7)}w ago`;
  }

  if (days < 365) {
    return `${Math.floor(days / 30)}mo ago`;
  }

  return `${Math.floor(days / 365)}y ago`;
}

function diplomaticEventInfo(type: string): {
  icon: string;
  label: string;
} {
  const normalized = type
    .replace(/[_-]/g, "")
    .replace(/\s/g, "")
    .toLowerCase();

  if (
    normalized.includes("peacemade") ||
    normalized.includes("peaceagreement") ||
    normalized.includes("treaty")
  ) {
    return {
      icon: "🕊️",
      label: "Peace Reached"
    };
  }

  if (normalized.includes("wardeclared")) {
    return {
      icon: "⚔️",
      label: "War Declared"
    };
  }

  if (normalized.includes("allianceformed")) {
    return {
      icon: "🤝",
      label: "Alliance Formed"
    };
  }

  if (
    normalized.includes("alliancebroken") ||
    normalized.includes("allianceended")
  ) {
    return {
      icon: "💔",
      label: "Alliance Ended"
    };
  }

  return {
    icon: "📜",
    label: type
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]/g, " ")
      .trim()
  };
}

function diagnostic(events: any[], scope: string): void {
  const sample = events.slice(0, 2).map((event) => {
    const nestedKeys: Record<string, string[]> = {};

    for (const key of [
      "data",
      "payload",
      "meta",
      "content",
      "attributes",
      "details",
      "eventData"
    ]) {
      if (
        event?.[key] &&
        typeof event[key] === "object" &&
        !Array.isArray(event[key])
      ) {
        nestedKeys[key] = Object.keys(event[key]).slice(0, 20);
      }
    }

    return {
      keys:
        event && typeof event === "object"
          ? Object.keys(event).slice(0, 30)
          : [],
      nestedKeys,
      detectedType: eventType(event)
    };
  });

  console.warn(
    `[WarEra ${scope} event diagnostics]`,
    JSON.stringify(sample)
  );
}

export const data = new SlashCommandBuilder()
  .setName("diplomacy")
  .setDescription(
    "Wars, peace agreements and alliance intelligence"
  )
  .addStringOption((option) =>
    option
      .setName("country")
      .setDescription("Optional country name")
      .setRequired(false)
  );

export async function execute(i: any, ctx: any) {
  await i.deferReply();

  const query = i.options.getString("country")?.trim();

  const countries = await ctx.provider.countries();

  const country = query
    ? countries.find(
        (item: any) =>
          item.name?.toLowerCase() === query.toLowerCase() ||
          item.code?.toLowerCase() === query.toLowerCase()
      )
    : null;

  if (query && !country) {
    return i.editReply(
      `⚠️ No country named **${query}** was found.`
    );
  }

  const raw = await ctx.provider
    .events({
      limit: 25,
      ...(country ? { countryId: country.id } : {}),
      eventTypes: DIPLOMATIC_EVENTS
    })
    .catch(() => null);

  const events = asList(raw).slice(0, 8);

  const unknownEvents = events.filter(
    (event) => !eventType(event)
  );

  if (unknownEvents.length) {
    diagnostic(
      unknownEvents,
      country
        ? `${country.name} diplomacy`
        : "global diplomacy"
    );
  }

  const lines =
    events
      .map((event: any) => {
        const type =
          eventType(event) ?? "Diplomatic Activity";

        const info = diplomaticEventInfo(type);
        const when = compactTime(eventDateValue(event));

        return `${info.icon} **${text(info.label)}**${when ? ` — ${when}` : ""}`;
      })
      .join("\n") ||
    "No recent diplomatic events were returned by the provider.";

  const title = country
    ? `🤝 ${country.name.toUpperCase()} DIPLOMACY`
    : "🌐 GLOBAL DIPLOMACY INTELLIGENCE";

  return i.editReply({
    embeds: [
      embed(
        title,
        "Live wars, peace agreements and alliance developments from currently available WarEra provider data."
      )
        .setColor(0x3498db)
        .addFields({
          name: "📡 Recent Diplomatic Activity",
          value: lines,
          inline: false
        })
        .setFooter({
          text: unknownEvents.length
            ? "Some event schema diagnostics were recorded"
            : country
              ? `Country filter: ${country.name}`
              : "Live global diplomatic activity"
        })
    ]
  });
}
