import {SlashCommandBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("country")
  .setDescription("Country intelligence command");

export async function execute(interaction: any, _ctx: any) {
  return interaction.reply({
    content: "⚔️ **Country** module is online in WarEra Intelligence.",
    ephemeral: true
  });
}