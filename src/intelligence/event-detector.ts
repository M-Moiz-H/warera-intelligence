import type {Region,IntelEvent} from "../types/models.js";
export function detectRegionChange(previous:Region|undefined,current:Region):IntelEvent[]{
const out:IntelEvent[]=[];
if(previous&&previous.ownerCountryId!==current.ownerCountryId)out.push({type:"region_owner_changed",severity:"high",regionId:current.id,title:`Control changed: ${current.name}`,summary:"Region ownership changed in tracked data"});
if(previous&&previous.resistance!==current.resistance)out.push({type:"resistance_changed",severity:"watch",regionId:current.id,title:`Resistance changed: ${current.name}`,summary:`${previous.resistance??0}% → ${current.resistance??0}%`});
return out}