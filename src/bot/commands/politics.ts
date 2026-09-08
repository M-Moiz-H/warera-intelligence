import { SlashCommandBuilder } from "discord.js";
import { embed, text } from "./_utils.js";

const POLITICAL_EVENTS = ["newPresident","systemRevolt","revolutionStarted","revolutionEnded","financedRevolt","bankruptcy"];

function asList(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const value = raw as any;
  for (const candidate of [value.items,value.events,value.data,value.result,value.results]) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") return Object.values(candidate);
  }
  return [];
}

function objects(event: any): any[] {
  return [event,event?.data,event?.payload,event?.meta,event?.content,event?.attributes,event?.details,event?.eventData]
    .filter((value) => value && typeof value === "object");
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function eventType(event: any): string | null {
  for (const value of objects(event)) {
    const found = firstText(value.eventType,value.type,value.event,value.kind,value.action,value.category,value.eventName,value.typeName,value.name);
    if (found) return found;
  }
  return null;
}

function eventDetail(event: any): string | null {
  for (const value of objects(event)) {
    const found = firstText(value.title,value.description,value.message,value.text,value.summary,value.reason);
    if (found) return found;
  }
  return null;
}

function eventDate(event: any): string {
  for (const value of objects(event)) {
    const raw = firstText(value.createdAt,value.date,value.timestamp,value.occurredAt,value.updatedAt,value.time);
    if (!raw) continue;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : `<t:${Math.floor(date.getTime() / 1000)}:R>`;
  }
  return "";
}

function diagnostic(events: any[], scope: string): void {
  const sample = events.slice(0, 2).map((event) => {
    const nestedKeys: Record<string, string[]> = {};
    for (const key of ["data","payload","meta","content","attributes","details","eventData"]) {
      if (event?.[key] && typeof event[key] === "object" && !Array.isArray(event[key])) {
        nestedKeys[key] = Object.keys(event[key]).slice(0, 20);
      }
    }
    return {
      keys: event && typeof event === "object" ? Object.keys(event).slice(0, 30) : [],
      nestedKeys,
      detectedType: eventType(event),
      detectedDetail: eventDetail(event)
    };
  });
  console.warn(`[WarEra ${scope} event diagnostics]`, JSON.stringify(sample));
}

export const data = new SlashCommandBuilder()
  .setName("politics")
  .setDescription("Political events and country political intelligence")
  .addStringOption((option) => option.setName("country").setDescription("Optional country name").setRequired(false));

export async function execute(i: any, ctx: any) {
  await i.deferReply();
  const query = i.options.getString("country")?.trim();
  const countries = await ctx.provider.countries();
  const country = query ? countries.find((item: any) =>
    item.name?.toLowerCase() === query.toLowerCase() ||
    item.code?.toLowerCase() === query.toLowerCase()
  ) : null;

  if (query && !country) return i.editReply(`⚠️ No country named **${query}** was found.`);

  const raw = await ctx.provider.events({
    limit: 20,
    ...(country ? { countryId: country.id } : {}),
    eventTypes: POLITICAL_EVENTS
  }).catch(() => null);

  const events = asList(raw).slice(0, 10);
  const unknownEvents = events.filter((event) => !eventType(event));
  if (unknownEvents.length) diagnostic(unknownEvents, country ? `${country.name} politics` : "global politics");

  const lines = events.map((event: any) => {
    const type = eventType(event) ?? "Political activity";
    const when = eventDate(event);
    const detail = eventDetail(event);
    return `• **${text(type)}**${when ? ` — ${when}` : ""}${detail ? `\n  ${text(detail.slice(0, 140))}` : ""}`;
  }).join("\n") || "No recent political events were returned by the provider.";

  const fields: any[] = [];
  if (country) {
    fields.push(
      { name: "🌍 Country", value: `**${country.name}**`, inline: true },
      { name: "🏅 Military Rank", value: country.militaryRank != null ? `**${country.militaryRank}**` : "Unavailable", inline: true },
      { name: "📈 Economy Rank", value: country.economyRank != null ? `**${country.economyRank}**` : "Unavailable", inline: true }
    );
  }
  fields.push({ name: "📜 Recent Political Activity", value: lines, inline: false });

  return i.editReply({ embeds: [
    embed(country ? `🏛️ ${country.name.toUpperCase()} POLITICAL INTELLIGENCE` : "🏛️ POLITICAL INTELLIGENCE",
      "Political intelligence is based on public country data and political events exposed by the WarEra provider.")
      .setColor(0x9b59b6)
      .addFields(fields)
      .setFooter({ text: unknownEvents.length ? "Event schema diagnostics were recorded for unknown activity" : "Live political event intelligence" })
  ]});
}
