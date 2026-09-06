import { SlashCommandBuilder } from "discord.js";
import { pakistanIntel } from "../../services/intel-service.js";
import { embed, n } from "./_utils.js";

export const data = new SlashCommandBuilder()
  .setName("pakistan")
  .setDescription(
    "Full live Pakistan intelligence overview"
  );

function resistanceEmoji(value: number) {
  if (value >= 75) {
    return "🚨";
  }

  if (value >= 50) {
    return "🔴";
  }

  if (value >= 25) {
    return "🟡";
  }

  return "🟢";
}

export async function execute(
  interaction: any,
  ctx: any
) {
  await interaction.deferReply();

  const intel = await pakistanIntel(
    ctx.provider
  );

  if (!intel) {
    return interaction.editReply(
      "⚠️ Pakistan was not found in the live WarEra data."
    );
  }

  const country = intel.country;

  const topResistance =
    intel.resistance.regions.length > 0
      ? intel.resistance.regions
          .map(
            (region: any, index: number) =>
              `${index + 1}. **${region.name}** — ${
                Number(
                  region.resistance ?? 0
                ).toFixed(1)
              }%`
          )
          .join("\n")
      : "🟢 No occupied core regions detected.";

  const battleStatus =
    intel.battles.active.length > 0
      ? [
          `⚔️ Active: **${intel.battles.active.length}**`,
          `🗡️ Attacking: **${intel.battles.attackingCount}**`,
          `🛡️ Defending: **${intel.battles.defendingCount}**`,
          `💥 Total damage: **${n(
            intel.battles.totalDamage
          )}**`
        ].join("\n")
      : "🟢 No active Pakistan-related battles detected.";

  const intelligenceSummary =
    intel.threat.level === "CRITICAL"
      ? "Multiple major indicators require immediate attention."
      : intel.threat.level === "HIGH THREAT"
        ? "Pakistan has significant active conflict or occupation indicators."
        : intel.threat.level === "WATCH"
          ? "Some strategic indicators require continued monitoring."
          : "Current indicators show a relatively stable situation.";

  const response = embed(
    "🇵🇰 PAKISTAN INTELLIGENCE",
    `**Strategic Status:** ${intel.threat.emoji} **${intel.threat.level}**

${intelligenceSummary}`
  );

  response.addFields(
    {
      name: "👤 Country Profile",
      value: [
        `Population: **${n(country.population)}**`,
        `Military Rank: **${n(country.militaryRank)}**`,
        `Economy Rank: **${n(country.economyRank)}**`
      ].join("\n"),
      inline: true
    },

    {
      name: "🗺️ Territorial Control",
      value: [
        `Core Regions: **${intel.territory.totalCoreRegions}**`,
        `Controlled: **${intel.territory.controlledCoreRegions}**`,
        `Occupied: **${intel.territory.occupiedCoreRegions}**`,
        `Control: **${intel.territory.controlPercentage.toFixed(
          1
        )}%**`
      ].join("\n"),
      inline: true
    },

    {
      name: "⚠️ Threat Assessment",
      value: [
        `Level: ${intel.threat.emoji} **${intel.threat.level}**`,
        `Score: **${intel.threat.score.toFixed(1)}/100**`,
        `Avg. Resistance: **${intel.resistance.average.toFixed(
          1
        )}%**`
      ].join("\n"),
      inline: true
    },

    {
      name: "🔥 Occupation & Resistance",
      value: topResistance,
      inline: false
    },

    {
      name: "⚔️ Battle Intelligence",
      value: battleStatus,
      inline: false
    }
  );

  response.setFooter({
    text:
      "WarEra Intelligence • Live strategic analysis"
  });

  response.setTimestamp();

  return interaction.editReply({
    embeds: [response]
  });
}
