import {SlashCommandBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("pakistan")
  .setDescription("Pakistan intelligence command");

export async function execute(interaction: any, _ctx: any) {
  return interaction.reply({
    content: "⚔️ **Pakistan** module is online in WarEra Intelligence.",
    ephemeral: true
  });
}