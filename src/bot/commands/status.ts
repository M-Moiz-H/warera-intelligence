import {SlashCommandBuilder,EmbedBuilder} from "discord.js";
import {status} from "../../services/status-service.js";
export const data=new SlashCommandBuilder().setName("status").setDescription("Check intelligence system status");
export async function execute(i:any,ctx:any){const s=await status(ctx.provider);return i.reply({embeds:[new EmbedBuilder().setTitle("🩺 WARERA INTELLIGENCE STATUS").addFields({name:"Database",value:s.database?"🟢 Online":"🔴 Error",inline:true},{name:"Provider",value:s.provider?"🟢 Reachable":"🟡 Unavailable",inline:true},{name:"Source",value:s.name})]})}