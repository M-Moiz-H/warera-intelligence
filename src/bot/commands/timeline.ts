import { SlashCommandBuilder } from "discord.js";
import { timeline } from "../../services/timeline-service.js";
import { embed, text } from "./_utils.js";
export const data=new SlashCommandBuilder().setName("timeline").setDescription("Recent intelligence timeline");
export async function execute(i:any){await i.deferReply();const rows=await timeline();const lines=rows.slice(0,20).map((x:any)=>`• **${text(x.title)}** — ${text(x.summary,"No summary")}`);return i.editReply({embeds:[embed("🕒 INTELLIGENCE TIMELINE",lines.join("\n")||"No historical intelligence events stored yet.")]});}