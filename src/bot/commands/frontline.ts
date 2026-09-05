import {SlashCommandBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("frontline")
  .setDescription("Frontline intelligence command");

export async function execute(interaction: any, _ctx: any) {
  return interaction.reply({
    content: "⚔️ **Frontline** module is online in WarEra Intelligence.",
    ephemeral: true
  });
}