import {listWatch} from "../database/repositories/watchlists.js";
export async function getWatchlist(guildId:string){return listWatch(guildId)}