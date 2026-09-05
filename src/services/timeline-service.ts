import {supabase} from "../database/supabase.js";
export async function timeline(countryId?:string){let q=supabase.from("intelligence_events").select("*").order("occurred_at",{ascending:false}).limit(50);
if(countryId)q=q.eq("country_id",countryId);
const {data,error}=await q;
if(error)throw error;
return data??[]}