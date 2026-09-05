import {SlashCommandBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("alerts")
  .setDescription("Alerts intelligence command");

export async function execute(interaction: any, _ctx: any) {
  return interaction.reply({
    content: "⚔️ **Alerts** module is online in WarEra Intelligence.",
    ephemeral: true
  });
}