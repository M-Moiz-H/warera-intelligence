import {
  SlashCommandBuilder
} from "discord.js";

import {
  liveCountry
} from "../../services/intel-service.js";

import {
  embed,
  n
} from "./_utils.js";

export const data =
  new SlashCommandBuilder()
    .setName("country")
    .setDescription(
      "Get live country intelligence"
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription(
          "Country name, code, or ID"
        )
        .setRequired(true)
    );

export async function execute(
  interaction: any,
  ctx: any
) {
  await interaction.deferReply();

  const query =
    interaction.options.getString(
      "name",
      true
    );

  const country =
    await liveCountry(
      ctx.provider,
      query
    );

  if (!country) {
    return interaction.editReply(
      "⚠️ Country not found in the live provider response."
    );
  }

  const title =
    `🌍 ${country.name.toUpperCase()}`;

  const response = embed(
    title,
    "Live country intelligence • WarEra"
  )
    .setColor(0x5865f2)
    .addFields(
      {
        name: "👥 Population",
        value: `**${n(
          country.population
        )}**`,
        inline: true
      },
      {
        name: "🎖️ Military Rank",
        value:
          country.militaryRank !==
          undefined
            ? `**#${n(
                country.militaryRank
              )}**`
            : "**N/A**",
        inline: true
      },
      {
        name: "💰 Economy Rank",
        value:
          country.economyRank !==
          undefined
            ? `**#${n(
                country.economyRank
              )}**`
            : "**N/A**",
        inline: true
      },
      {
        name: "🏷️ Country Code",
        value: `**${
          country.code?.toUpperCase() ??
          "N/A"
        }**`,
        inline: true
      }
    );

  response.setFooter({
    text:
      `WarEra ID: ${country.id}`
  });

  return interaction.editReply({
    embeds: [response]
  });
}
