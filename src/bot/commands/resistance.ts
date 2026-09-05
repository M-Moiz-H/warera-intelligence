import {SlashCommandBuilder} from "discord.js";
export const data=new SlashCommandBuilder().setName("resistance").setDescription("Resistance intelligence command");
export async function execute(interaction:any,ctx:any){return interaction.reply({content:"⚔️ **Resistance** module is online in WarEra Intelligence.",ephemeral:name!=="intel"})}