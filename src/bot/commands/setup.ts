import { SlashCommandBuilder } from "discord.js";
import { env } from "../../config/env.js";
import { embed } from "./_utils.js";
export const data=new SlashCommandBuilder().setName("setup").setDescription("Show WarEra Intelligence configuration status");
export async function execute(i:any){return i.reply({embeds:[embed("⚙️ WARERA INTELLIGENCE SETUP",`Primary country: **${env.primaryCountry}**\nAPI key configured: **${env.wareraApiKey ? "Yes" : "No"}**\nSync interval: **${env.syncIntervalSeconds}s**\nDatabase: **Supabase configured**\n\nSecrets remain server-side and are never displayed.`)] ,ephemeral:true});}