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

  if (raw && typeof raw === "object") {
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
  }

  return [];
}

function typeIcon(value: string): string {
  const lower = value.toLowerCase();

  if (lower.includes("alliance")) return "🤝";
  if (lower.includes("peace")) return "🕊️";
  if (lower.includes("war")) return "⚔️";

  return "📜";
}

function eventDate(event: any): string {
  const value =
    event.createdAt ??
    event.date ??
    event.timestamp ??
    event.occurredAt;

  if (!value) return "";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : `<t:${Math.floor(date.getTime() / 1000)}:R>`;
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
    return i.editReply(`⚠️ No country named **${query}** was found.`);
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
    events
      .map((event: any) => {
        const type = String(
          event.eventType ??
            event.type ??
            event.event ??
            event.name ??
            "Unknown event"
        );

        const when = eventDate(event);
        const detail =
          event.title ??
          event.description ??
          event.message ??
          "";

        return `${typeIcon(type)} **${text(type)}**${when ? ` — ${when}` : ""}${detail ? `\n  ${text(String(detail).slice(0, 120))}` : ""}`;
      })
      .join("\n") ||
    "No recent diplomatic events were returned by the provider.";

  const title = country
    ? `🤝 ${country.name.toUpperCase()} DIPLOMACY`
    : "🤝 DIPLOMACY INTELLIGENCE";

  return i.editReply({
    embeds: [
      embed(
        title,
        "Wars, peace activity and alliance developments based on diplomatic events exposed by the WarEra provider."
      )
        .setColor(0x3498db)
        .addFields({
          name: "📡 Recent Diplomatic Activity",
          value: lines,
          inline: false
        })
        .setFooter({
          text: country
            ? `Country filter: ${country.name}`
            : "Global diplomatic activity"
        })
    ]
  });
}
