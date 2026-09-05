import {SlashCommandBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("economy")
  .setDescription("Economy intelligence command");

export async function execute(interaction: any, _ctx: any) {
  return interaction.reply({
    content: "⚔️ **Economy** module is online in WarEra Intelligence.",
    ephemeral: true
  });
}