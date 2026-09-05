import {SlashCommandBuilder} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("battle")
  .setDescription("Battle intelligence command");

export async function execute(interaction: any, _ctx: any) {
  return interaction.reply({
    content: "⚔️ **Battle** module is online in WarEra Intelligence.",
    ephemeral: true
  });
}