import { SlashCommandBuilder } from "discord.js";
import { embed, n, text } from "./_utils.js";

export const data = new SlashCommandBuilder()
  .setName("economy")
  .setDescription("Live WarEra market and economic intelligence")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("Optional item name or code to filter")
      .setRequired(false)
  );

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
      if (Array.isArray(candidate)) return candidate;

      if (candidate && typeof candidate === "object") {
        return Object.entries(candidate).map(([key, row]) =>
          row && typeof row === "object"
            ? { code: key, ...(row as any) }
            : { code: key, price: row }
        );
      }
    }

    return Object.entries(value).map(([key, row]) =>
      row && typeof row === "object"
        ? { code: key, ...(row as any) }
        : { code: key, price: row }
    );
  }

  return [];
}

function itemName(row: any): string {
  return String(
    row.name ??
      row.itemName ??
      row.itemCode ??
      row.code ??
      row.id ??
      "Unknown item"
  );
}

function price(row: any): number | null {
  const value =
    row.price ??
    row.currentPrice ??
    row.value ??
    row.amount ??
    row.averagePrice;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function execute(i: any, ctx: any) {
  await i.deferReply();

  const query = i.options.getString("item")?.trim().toLowerCase();
  const raw = await ctx.provider.marketPrices().catch(() => null);

  let rows = asRows(raw)
    .map((row) => ({
      ...row,
      __name: itemName(row),
      __price: price(row)
    }))
    .filter((row) => row.__price !== null);

  if (query) {
    rows = rows.filter((row) =>
      `${row.__name} ${row.code ?? ""}`.toLowerCase().includes(query)
    );
  }

  rows.sort((a, b) => Number(b.__price) - Number(a.__price));

  const highest =
    [...rows]
      .slice(0, 5)
      .map(
        (row, index) =>
          `**${index + 1}. ${text(row.__name)}** — ${n(row.__price)}`
      )
      .join("\n") || "No recognized market prices were returned.";

  const cheapest =
    [...rows]
      .slice(-5)
      .reverse()
      .map(
        (row, index) =>
          `**${index + 1}. ${text(row.__name)}** — ${n(row.__price)}`
      )
      .join("\n") || "No recognized market prices were returned.";

  const average =
    rows.length
      ? rows.reduce((sum, row) => sum + Number(row.__price), 0) / rows.length
      : 0;

  const title = query
    ? `💰 MARKET INTELLIGENCE — ${query.toUpperCase()}`
    : "💰 ECONOMY INTELLIGENCE";

  return i.editReply({
    embeds: [
      embed(
        title,
        "Live market overview based on prices currently exposed by the WarEra provider."
      )
        .setColor(0xf1c40f)
        .addFields(
          {
            name: "📦 Items Analysed",
            value: n(rows.length),
            inline: true
          },
          {
            name: "📊 Average Price",
            value: rows.length ? n(average) : "Unavailable",
            inline: true
          },
          {
            name: "🔎 Filter",
            value: query ? `**${query}**` : "All available items",
            inline: true
          },
          {
            name: "📈 Highest Prices",
            value: highest,
            inline: false
          },
          {
            name: "📉 Lowest Prices",
            value: cheapest,
            inline: false
          }
        )
        .setFooter({
          text: "Live prices are provider data; historical price movement will be added in Phase 9"
        })
    ]
  });
}
