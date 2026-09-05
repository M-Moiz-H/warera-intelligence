import {SlashCommandBuilder} from "discord.js";
export const data=new SlashCommandBuilder().setName("timeline").setDescription("Timeline intelligence command");
export async function execute(interaction:any,ctx:any){return interaction.reply({content:"⚔️ **Timeline** module is online in WarEra Intelligence.",ephemeral:name!=="intel"})}