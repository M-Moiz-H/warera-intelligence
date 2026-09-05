import {supabase} from "../supabase.js";
export async function upsertRows(table:string,rows:any[]){if(!rows.length)return;const {error}=await supabase.from(table).upsert(rows);if(error)throw error}
export async function recent(table:string,limit=50){const {data,error}=await supabase.from(table).select("*").order("updated_at",{ascending:false}).limit(limit);if(error)throw error;return data??[]}