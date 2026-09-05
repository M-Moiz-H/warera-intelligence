import { SlashCommandBuilder } from "discord.js";
import { timeline } from "../../services/timeline-service.js";
import { embed, text } from "./_utils.js";
export const data=new SlashCommandBuilder().setName("alerts").setDescription("Recent high-priority intelligence alerts");
export async function execute(i:any){await i.deferReply();const rows=await timeline();const alerts=rows.filter((x:any)=>["high","critical","watch"].includes(x.severity)).slice(0,15);const lines=alerts.map((x:any)=>`🚨 **${text(x.title)}** — ${text(x.summary,"No details")}`);return i.editReply({embeds:[embed("🔔 INTELLIGENCE ALERTS",lines.join("\n")||"🟢 No stored alerts right now.")]});}