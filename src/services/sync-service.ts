import type {WarEraProvider} from "../warera/provider.js";
import {saveCountries} from "../database/repositories/countries.js";
import {saveRegions} from "../database/repositories/regions.js";
export async function syncCore(provider:WarEraProvider){const result={countries:0,regions:0,errors:[] as string[]};
try{const c=await provider.countries();await saveCountries(c);result.countries=c.length}catch(e:any){result.errors.push(`countries: ${e.message}`)}
try{const r=await provider.regions();await saveRegions(r);result.regions=r.length}catch(e:any){result.errors.push(`regions: ${e.message}`)}
return result}