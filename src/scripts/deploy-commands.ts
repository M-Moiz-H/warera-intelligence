import {REST,Routes} from "discord.js";
import {env} from "../config/env.js";
import {modules} from "../bot/command-loader.js";
const rest=new REST({version:"10"}).setToken(env.discordToken);
const body=modules.map(m=>m.data.toJSON());
const route=env.discordGuildId?Routes.applicationGuildCommands(env.discordClientId,env.discordGuildId):Routes.applicationCommands(env.discordClientId);
await rest.put(route,{body});
console.log(`Deployed ${body.length} commands`);