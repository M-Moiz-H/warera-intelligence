import {createBotClient} from "./bot/client.js";
import {route} from "./bot/interaction-router.js";
import {env} from "./config/env.js";
import {GatewayProvider} from "./warera/gateway-provider.js";
import {startScheduler} from "./services/scheduler.js";
const client=createBotClient(),provider=new GatewayProvider();const ctx={provider};client.once("ready",c=>console.log(`⚔️ WarEra Intelligence online as ${c.user.tag}`));client.on("interactionCreate",i=>void route(i,ctx));startScheduler(provider);client.login(env.discordToken);