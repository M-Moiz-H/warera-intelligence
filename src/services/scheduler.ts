import type {WarEraProvider} from "../warera/provider.js";
import {env} from "../config/env.js";
import {syncCore} from "./sync-service.js";
export function startScheduler(provider:WarEraProvider){const tick=async()=>{try{console.log("[sync]",await syncCore(provider))}catch(e){console.error("[sync]",e)}};
void tick();
return setInterval(()=>void tick(),env.syncIntervalSeconds*1000)}