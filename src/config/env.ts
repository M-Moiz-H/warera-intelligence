import "dotenv/config";
const required=(name:string)=>{const value=process.env[name];if(!value)throw new Error(`Missing environment variable: ${name}`);return value};
export const env={
 discordToken:required("DISCORD_TOKEN"),
 discordClientId:required("DISCORD_CLIENT_ID"),
 discordGuildId:process.env.DISCORD_GUILD_ID,
 supabaseUrl:required("SUPABASE_URL"),
 supabaseServiceRoleKey:required("SUPABASE_SERVICE_ROLE_KEY"),
 wareraApiBaseUrl:process.env.WARERA_API_BASE_URL??"https://api2.warera.io/trpc",
 wareraGatewayUrl:process.env.WARERA_GATEWAY_URL??"https://gateway.warerastats.io/trpc",
 wareraApiKey:process.env.WARERA_API_KEY,
 syncIntervalSeconds:Math.max(30,Number(process.env.SYNC_INTERVAL_SECONDS??60)),
 primaryCountry:process.env.PRIMARY_COUNTRY??"Pakistan"
};