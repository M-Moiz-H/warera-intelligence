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

function eventDate(event: any): string {
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

    return Number.isNaN(date.getTime())
      ? raw
      : `<t:${Math.floor(date.getTime() / 1000)}:R>`;
  }

  return "";
}

function diplomaticLabel(type: string): {
  icon: string;
  label: string;
} {
  const normalized = type.replace(/[^a-z]/gi, "").toLowerCase();

  const labels: Record<string, { icon: string; label: string }> = {
    wardeclared: {
      icon: "⚔️",
      label: "War Declared"
    },
    peacemade: {
      icon: "🕊️",
      label: "Peace Agreement Reached"
    },
    peaceagreement: {
      icon: "🕊️",
      label: "Peace Agreement Reached"
    },
    allianceformed: {
      icon: "🤝",
      label: "Alliance Formed"
    },
    alliancebroken: {
      icon: "💔",
      label: "Alliance Broken"
    }
  };

  return labels[normalized] ?? {
    icon: "🌐",
    label: type
  };
}

function formatEvent(event: any): string {
  const type = eventType(event) ?? "Diplomatic Activity";
  const { icon, label } = diplomaticLabel(type);
  const when = eventDate(event);

  return `${icon} **${text(label)}**${when ? ` — ${when}` : ""}`;
}

export const data = new SlashCommandBuilder()
  .setName("diplomacy")
  .setDescription("Wars, peace agreements and alliance intelligence")
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

  const events = asList(raw).slice(0, 10);

  const lines =
    events.map(formatEvent).join("\n") ||
    "No recent diplomatic events were returned by the provider.";

  return i.editReply({
    embeds: [
      embed(
        country
          ? `🤝 ${country.name.toUpperCase()} DIPLOMACY`
          : "🌐 GLOBAL DIPLOMACY INTELLIGENCE",
        "Live wars, peace agreements and alliance developments from currently available WarEra provider data."
      )
        .setColor(0x3498db)
        .addFields({
          name: "📡 Recent Diplomatic Activity",
          value: lines.slice(0, 1024),
          inline: false
        })
        .setFooter({
          text: country
            ? `Country filter: ${country.name}`
            : "Live global diplomatic activity"
        })
    ]
  });
}
