import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { findCountry } from "../../database/repositories/countries.js";
import { pakistanOccupied } from "../../database/repositories/regions.js";
import {
  progressBar,
  resistanceStatus
} from "../../intelligence/resistance.js";

export const data = new SlashCommandBuilder()
  .setName("resistance")
  .setDescription("Track occupied Pakistan core resistance");

export async function execute(interaction: any, _ctx: any) {
  const pakistan = await findCountry("Pakistan");

  if (!pakistan) {
    return interaction.reply({
      content: "⚠️ Pakistan has not been synced yet. Please wait for the data sync.",
      ephemeral: true
    });
  }

  const regions = await pakistanOccupied(pakistan.id);

  if (!regions.length) {
    return interaction.reply({
      content: "🟢 No occupied Pakistan core regions are currently stored.",
      ephemeral: true
    });
  }

  const description = regions
    .map((region: any) => {
      const resistance = Number(region.resistance ?? 0);

      return [
        `📍 **${region.name}**`,
        `${progressBar(resistance)} ${resistance.toFixed(1)}%`,
        `Status: **${resistanceStatus(resistance)}**`
      ].join("\n");
    })
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setTitle("🇵🇰 PAKISTAN RESISTANCE INTELLIGENCE")
    .setDescription(description)
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}