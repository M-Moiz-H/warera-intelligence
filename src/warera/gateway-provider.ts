import {TrpcClient} from "./trpc-client.js";
import type {WarEraProvider} from "./provider.js";
import type {Battle,Country,Region} from "../types/models.js";
import {env} from "../config/env.js";
export class GatewayProvider implements WarEraProvider{
 name="warera-api";
 private c=new TrpcClient();
 async healthCheck(){try{await this.c.get("country.getAllCountries");return true}catch{return false}}
 async countries(){return this.c.get<Country[]>("country.getAllCountries")}
 async country(id:string){try{return await this.c.get<Country>("country.getCountryById",{id})}catch{return null}}
 async regions(){const x:any=await this.c.get("region.getRegionsObject");return Array.isArray(x)?x:Object.values(x??"{}") as Region[]}
 async region(id:string){try{return await this.c.get<Region>("region.getById",{id})}catch{return null}}
 async battles(input?:unknown){const x:any=await this.c.get("battle.getBattles",input);return Array.isArray(x)?x:(x?.items??x?.battles??[])}
 async events(input?:unknown){return this.c.get("event.getEventsPaginated",input)}
 async ranking(input?:unknown){return this.c.get("ranking.getRanking",input)}
 async militaryUnit(id:string){return this.c.get("mu.getById",{id})}
 async party(id:string){return this.c.get("party.getById",{id})}
 async user(id:string){return this.c.get("user.getUserLite",{id})}
 async marketPrices(input?:unknown){return this.c.get("itemTrading.getPrices",input)}
}