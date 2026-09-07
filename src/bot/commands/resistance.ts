import { SlashCommandBuilder } from "discord.js";
import { resistanceIntel } from "../../services/intel-service.js";
import { embed, n } from "./_utils.js";
import { progressBar, resistanceStatus } from "../../intelligence/resistance.js";

export const data = new SlashCommandBuilder()
  .setName("resistance")
  .setDescription("Resistance, occupation and liberation intelligence")
  .addStringOption((option) =>
    option
      .setName("country")
      .setDescription("Country to analyse (defaults to Pakistan)")
      .setRequired(false)
  );

export async function execute(i: any, ctx: any) {
  await i.deferReply();

  const countryQuery = i.options.getString("country") ?? "Pakistan";
  const intel = await resistanceIntel(ctx.provider, countryQuery);

  if (!intel) {
    return i.editReply(`⚠️ Country not found: **${countryQuery}**`);
  }

  const e = embed(
    `🔥 ${intel.country.name.toUpperCase()} RESISTANCE INTELLIGENCE`,
    intel.occupiedCount > 0
      ? "Occupied core regions ranked by current resistance and liberation potential."
      : "No occupied core regions were detected in the currently available provider data."
  ).addFields(
    { name: "🏴 Occupied", value: n(intel.occupiedCount), inline: true },
    { name: "🛡️ Controlled", value: n(intel.controlledCount), inline: true },
    { name: "📈 Avg. Resistance", value: `${Number(intel.averageResistance).toFixed(1)}%`, inline: true },
    { name: "🚨 Critical Opportunities", value: n(intel.criticalCount), inline: true }
  );

  for (const region of intel.regions.slice(0, 10)) {
    const owner = region.ownerCountryId ? `\nOccupier: \`${region.ownerCountryId}\`` : "";
    e.addFields({
      name: `${region.opportunity === "CRITICAL" ? "🚨" : region.opportunity === "HIGH" ? "🔴" : region.opportunity === "ELEVATED" ? "🟡" : "🟢"} ${region.name}`,
      value: `${progressBar(region.resistance)} **${Number(region.resistance).toFixed(1)}%** — ${resistanceStatus(region.resistance)}${owner}\nLiberation opportunity: **${region.opportunity}**`,
      inline: false
    });
  }

  if (intel.regions.length > 10) {
    e.setFooter({ text: `Showing top 10 of ${intel.regions.length} occupied regions • Live provider analysis` });
  } else {
    e.setFooter({ text: "Live provider analysis" });
  }

  return i.editReply({ embeds: [e] });
}
