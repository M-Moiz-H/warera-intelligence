import { SlashCommandBuilder } from "discord.js";
import { globalSituation } from "../../services/intel-service.js";
import { embed, n } from "./_utils.js";

export const data = new SlashCommandBuilder()
  .setName("global")
  .setDescription("Global WarEra situation and activity overview");

export async function execute(i: any, ctx: any) {
  await i.deferReply();
  const x = await globalSituation(ctx.provider);

  const topPower = x.rankings
    .slice(0, 10)
    .map((row, index) => `**${index + 1}. ${row.country.name}** — ${n(row.score)}`)
    .join("\n") || "No power-ranking data available.";

  const active = x.activeCountries
    .slice(0, 10)
    .map((row, index) => `**${index + 1}. ${row.name}** — ${n(row.battleCount)} battle${row.battleCount === 1 ? "" : "s"}`)
    .join("\n") || "No country activity could be mapped from the active battles.";

  const conflictSummary = x.battles
    .slice(0, 5)
    .map((battle) => {
      const a = battle.attackerCountryId ?? "Unknown";
      const d = battle.defenderCountryId ?? "Unknown";
      return `• \`${battle.id}\` — ${a} vs ${d}`;
    })
    .join("\n") || "No active battles returned by the provider.";

  const e = embed(
    "🌐 GLOBAL INTELLIGENCE",
    "Live global overview built from currently available WarEra countries and battle data."
  ).addFields(
    { name: "🌍 Countries Analysed", value: n(x.countries.length), inline: true },
    { name: "⚔️ Active Battles", value: n(x.battles.length), inline: true },
    { name: "💥 Observed Damage", value: n(x.totalDamage), inline: true },
    { name: "🏆 Power Rankings", value: topPower, inline: false },
    { name: "🔥 Most Active Countries", value: active, inline: false },
    { name: "⚔️ Conflict Snapshot", value: conflictSummary, inline: false }
  );

  e.setFooter({ text: "Activity is based on battles returned by the provider during this command" });
  return i.editReply({ embeds: [e] });
}
