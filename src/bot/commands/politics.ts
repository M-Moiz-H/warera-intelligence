import { SlashCommandBuilder } from "discord.js";
import { embed, text } from "./_utils.js";

const POLITICAL_EVENTS = [
  "newPresident",
  "systemRevolt",
  "revolutionStarted",
  "revolutionEnded",
  "financedRevolt",
  "bankruptcy"
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

function eventType(event: any): string {
  return String(
    event.eventType ??
      event.type ??
      event.event ??
      event.name ??
      "Unknown event"
  );
}

function eventDate(event: any): string {
  const value =
    event.createdAt ??
    event.date ??
    event.timestamp ??
    event.occurredAt ??
    event.updatedAt;

  if (!value) return "";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

export const data = new SlashCommandBuilder()
  .setName("politics")
  .setDescription("Political events and country political intelligence")
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
      limit: 20,
      ...(country ? { countryId: country.id } : {}),
      eventTypes: POLITICAL_EVENTS
    })
    .catch(() => null);

  const events = asList(raw).slice(0, 10);

  const lines =
    events
      .map((event: any) => {
        const type = eventType(event);
        const when = eventDate(event);
        const detail =
          event.title ??
          event.description ??
          event.message ??
          "";

        return `• **${text(type)}**${when ? ` — ${when}` : ""}${detail ? `\n  ${text(String(detail).slice(0, 120))}` : ""}`;
      })
      .join("\n") ||
    "No recent political events were returned by the provider.";

  const title = country
    ? `🏛️ ${country.name.toUpperCase()} POLITICAL INTELLIGENCE`
    : "🏛️ POLITICAL INTELLIGENCE";

  const fields: any[] = [];

  if (country) {
    fields.push(
      {
        name: "🌍 Country",
        value: `**${country.name}**`,
        inline: true
      },
      {
        name: "🏅 Military Rank",
        value:
          country.militaryRank != null
            ? `**${country.militaryRank}**`
            : "Unavailable",
        inline: true
      },
      {
        name: "📈 Economy Rank",
        value:
          country.economyRank != null
            ? `**${country.economyRank}**`
            : "Unavailable",
        inline: true
      }
    );
  }

  fields.push({
    name: "📜 Recent Political Activity",
    value: lines,
    inline: false
  });

  return i.editReply({
    embeds: [
      embed(
        title,
        "Political intelligence is based on public country data and political events exposed by the WarEra provider."
      )
        .setColor(0x9b59b6)
        .addFields(fields)
        .setFooter({
          text: "Government details are shown only when exposed by the connected provider"
        })
    ]
  });
}
