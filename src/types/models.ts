export type Json=Record<string,unknown>;
export type Severity="info"|"watch"|"high"|"critical";
export interface Country{id:string;name:string;code?:string;population?:number;militaryRank?:number;economyRank?:number;raw?:Json}
export interface Region{id:string;name:string;countryId?:string|null;ownerCountryId?:string|null;isCore:boolean;resistance?:number|null;raw?:Json}
export interface Battle{id:string;warId?:string|null;regionId?:string|null;attackerCountryId?:string|null;defenderCountryId?:string|null;attackerDamage?:number|null;defenderDamage?:number|null;status?:string|null;endsAt?:string|null;raw?:Json}
export interface IntelEvent{type:string;severity:Severity;countryId?:string;regionId?:string;title:string;summary?:string;payload?:Json;occurredAt?:Date}