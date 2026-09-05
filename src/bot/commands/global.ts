import {SlashCommandBuilder} from "discord.js";
export const data=new SlashCommandBuilder().setName("global").setDescription("Global intelligence command");
export async function execute(interaction:any,ctx:any){return interaction.reply({content:"⚔️ **Global** module is online in WarEra Intelligence.",ephemeral:name!=="intel"})}