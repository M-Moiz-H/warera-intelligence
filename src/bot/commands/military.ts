import { SlashCommandBuilder } from "discord.js";
import { globalIntel } from "../../services/intel-service.js";
import { embed, n } from "./_utils.js";

export const data = new SlashCommandBuilder()
  .setName("military")
  .setDescription("Military ranking and conflict intelligence")
  .addStringOption((option) =>
    option
      .setName("country")
      .setDescription("Optional country to inspect")
      .setRequired(false)
  );

export async function execute(interaction: any, ctx: any) {
  await interaction.deferReply();

  const intel = await globalIntel(ctx.provider);
  const query = interaction.options.getString("country")?.trim();

  const countries = [...intel.countries]
    .filter((country) => country.militaryRank != null)
    .sort(
      (a, b) =>
        Number(a.militaryRank ?? 999999) -
        Number(b.militaryRank ?? 999999)
    );

  if (query) {
    const country = intel.countries.find(
      (item) =>
        item.name.toLowerCase() === query.toLowerCase() ||
        item.code?.toLowerCase() === query.toLowerCase()
    );

    if (!country) {
      return interaction.editReply(`⚠️ No country named **${query}** was found.`);
    }

    const relatedBattles = intel.battles.filter(
      (battle: any) =>
        battle.attackerCountryId === country.id ||
        battle.defenderCountryId === country.id
    );

    return interaction.editReply({
      embeds: [
        embed(
          `🪖 ${country.name.toUpperCase()} MILITARY INTELLIGENCE`,
          "Military ranking and currently observed conflict activity."
        )
          .setColor(0x5865f2)
          .addFields(
            {
              name: "🏅 Military Rank",
              value: `**${n(country.militaryRank)}**`,
              inline: true
            },
            {
              name: "⚔️ Related Battles",
              value: `**${relatedBattles.length}**`,
              inline: true
            },
            {
              name: "🌍 Country Code",
              value: `**${country.code ?? "Unavailable"}**`,
              inline: true
            },
            {
              name: "🔥 Conflict Activity",
              value:
                relatedBattles
                  .slice(0, 5)
                  .map(
                    (battle: any) =>
                      `⚔️ \`${battle.id}\` — ${battle.status ?? "Unknown"}`
                  )
                  .join("\n") ||
                "No related battles were returned by the provider.",
              inline: false
            }
          )
      ]
    });
  }

  return interaction.editReply({
    embeds: [
      embed(
        "🪖 GLOBAL MILITARY INTELLIGENCE",
        "Military rankings and conflict activity based on currently available WarEra data."
      )
        .setColor(0x5865f2)
        .addFields(
          {
            name: "🏆 Top Military Rankings",
            value:
              countries
                .slice(0, 10)
                .map(
                  (country, index) =>
                    `**${index + 1}. ${country.name}** — Military rank **${n(country.militaryRank)}**`
                )
                .join("\n") || "No military ranking data available.",
            inline: false
          },
          {
            name: "⚔️ Battles Observed",
            value: `**${intel.battles.length}**`,
            inline: true
          },
          {
            name: "🌍 Countries Ranked",
            value: `**${countries.length}**`,
            inline: true
          },
          {
            name: "💡 Country Lookup",
            value: "Use `/military country:<country name>` for country-specific military intelligence.",
            inline: false
          }
        )
    ]
  });
}
