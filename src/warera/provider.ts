import type {Battle,Country,Region} from "../types/models.js";
export interface WarEraProvider{
 name:string;
 healthCheck():Promise<boolean>;
 countries():Promise<Country[]>;
 country(id:string):Promise<Country|null>;
 regions():Promise<Region[]>;
 region(id:string):Promise<Region|null>;
 battles(input?:unknown):Promise<Battle[]>;
 events(input?:unknown):Promise<unknown>;
 ranking(input?:unknown):Promise<unknown>;
 militaryUnit(id:string):Promise<unknown>;
 party(id:string):Promise<unknown>;
 user(id:string):Promise<unknown>;
 marketPrices(input?:unknown):Promise<unknown>;
}