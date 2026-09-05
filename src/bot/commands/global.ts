import { SlashCommandBuilder } from "discord.js";
import { globalIntel } from "../../services/intel-service.js";
import { embed } from "./_utils.js";
export const data=new SlashCommandBuilder().setName("global").setDescription("Global WarEra situation overview");
export async function execute(i:any,ctx:any){await i.deferReply();const x=await globalIntel(ctx.provider);const top=x.rankings.slice(0,10).map((r,idx)=>`**${idx+1}. ${r.country.name}** — power score ${r.score}`).join("\n");return i.editReply({embeds:[embed("🌍 GLOBAL INTELLIGENCE",top||"No ranking data available.").addFields({name:"Countries",value:String(x.countries.length),inline:true},{name:"Battles observed",value:String(x.battles.length),inline:true})]});}