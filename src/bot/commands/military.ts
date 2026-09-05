import {SlashCommandBuilder} from "discord.js";
export const data=new SlashCommandBuilder().setName("military").setDescription("Military intelligence command");
export async function execute(interaction:any,ctx:any){return interaction.reply({content:"⚔️ **Military** module is online in WarEra Intelligence.",ephemeral:name!=="intel"})}