import type {WarEraProvider} from "./provider.js";
export class ProviderManager{
 constructor(public readonly provider:WarEraProvider){}
 async healthy(){
  return this.provider.healthCheck()
 }
}