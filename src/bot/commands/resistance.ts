import { SlashCommandBuilder } from "discord.js";
import { storedPakistanResistance } from "../../services/intel-service.js";
import { embed, n } from "./_utils.js";
import { progressBar, resistanceStatus } from "../../intelligence/resistance.js";
export const data = new SlashCommandBuilder().setName("resistance").setDescription("Pakistan occupation and resistance overview");
export async function execute(i: any) { await i.deferReply(); const data = await storedPakistanResistance(); if (!data) return i.editReply("⚠️ Pakistan not found in database."); const e = embed("🇵🇰 RESISTANCE INTELLIGENCE", `Stored resistance snapshot of Pakistan's core regions.`); for (const r of data.regions.slice(0, 10)) { const status = resistanceStatus(r.resistance ?? 0); e.addFields({ name: `${r.name}`, value: `${progressBar(r.resistance)} ${n(r.resistance)}% — ${status}`, inline: false }); } return i.editReply({ embeds: [e] }); }