import { SlashCommandBuilder } from "discord.js";
import { globalIntel } from "../../services/intel-service.js";
import { embed } from "./_utils.js";
export const data=new SlashCommandBuilder().setName("diplomacy").setDescription("Diplomatic situation overview");
export async function execute(i:any,ctx:any){await i.deferReply();const x=await globalIntel(ctx.provider);const lines=x.battles.slice(0,15).map((b:any)=>`⚔️ ${b.attackerCountryId??"?"} vs ${b.defenderCountryId??"?"} — ${b.status??"Unknown"}`);return i.editReply({embeds:[embed("🤝 DIPLOMATIC / CONFLICT OVERVIEW",lines.join("\n")||"No active conflict relationships were returned by the provider.")]});}