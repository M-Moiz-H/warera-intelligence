import { EmbedBuilder } from "discord.js";
export const text = (v: unknown, fallback = "Unknown") => v == null || v === "" ? fallback : String(v);
export const n = (v: unknown) => v == null || Number.isNaN(Number(v)) ? "N/A" : Number(v).toLocaleString();
export function embed(title: string, description?: string) { const e = new EmbedBuilder().setTitle(title).setTimestamp(); if (description) e.setDescription(description.slice(0, 4096)); return e; }
export async function safeDefer(i: any) { if (!i.deferred && !i.replied) await i.deferReply(); }
export async function edit(i: any, payload: any) { return i.deferred ? i.editReply(payload) : i.reply(payload); }