import {SlashCommandBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Setup intelligence command");

export async function execute(interaction: any, _ctx: any) {
  return interaction.reply({
    content: "⚔️ **Setup** module is online in WarEra Intelligence.",
    ephemeral: true
  });
}