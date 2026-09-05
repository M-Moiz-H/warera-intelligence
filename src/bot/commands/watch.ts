import {SlashCommandBuilder} from "discord.js";
export const data=new SlashCommandBuilder().setName("watch").setDescription("Watch intelligence command");
export async function execute(interaction:any,ctx:any){return interaction.reply({content:"⚔️ **Watch** module is online in WarEra Intelligence.",ephemeral:name!=="intel"})}