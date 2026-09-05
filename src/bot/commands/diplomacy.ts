import {SlashCommandBuilder} from "discord.js";
export const data=new SlashCommandBuilder().setName("diplomacy").setDescription("Diplomacy intelligence command");
export async function execute(interaction:any,ctx:any){return interaction.reply({content:"⚔️ **Diplomacy** module is online in WarEra Intelligence.",ephemeral:name!=="intel"})}