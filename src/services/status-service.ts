import {supabase} from "../database/supabase.js";
import type {WarEraProvider} from "../warera/provider.js";
export async function status(provider:WarEraProvider){let db=true;
try{const {error}=await supabase.from("countries").select("id").limit(1);
db=!error}catch{db=false}
return {database:db,provider:await provider.healthCheck(),name:provider.name}}