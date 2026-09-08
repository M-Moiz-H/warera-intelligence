import { REST, Routes } from "discord.js";
import { modules } from "../bot/command-loader.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const token = requireEnv("DISCORD_TOKEN");
const clientId = requireEnv("DISCORD_CLIENT_ID");
const guildId = process.env.DISCORD_GUILD_ID?.trim();

function loadCommands() {
  const commands = new Map<string, unknown>();

  for (const command of modules) {
    if (!command?.data || typeof command.data.toJSON !== "function") {
      console.warn("Skipping command module: missing export 'data'");
      continue;
    }

    const name = command.data.name;
    if (!name) {
      console.warn("Skipping command module: command has no name");
      continue;
    }

    if (commands.has(name)) {
      console.warn(`Skipping duplicate command /${name}`);
      continue;
    }

    commands.set(name, command.data.toJSON());
    console.log(`Loaded command: /${name}`);
  }

  return [...commands.values()];
}

async function registerGlobalCommands(rest: REST, commands: unknown[]): Promise<void> {
  console.log(`Registering ${commands.length} unique global slash commands...`);

  const result = await rest.put(
    Routes.applicationCommands(clientId),
    { body: commands }
  );

  console.log(
    `Successfully registered ${Array.isArray(result) ? result.length : commands.length} global slash commands.`
  );
}

async function main(): Promise<void> {
  const commands = loadCommands();

  if (!commands.length) {
    throw new Error("No slash commands were loaded.");
  }

  const rest = new REST({ version: "10" }).setToken(token);

  if (guildId) {
    try {
      console.log(`Registering ${commands.length} unique guild slash commands to ${guildId}...`);

      const result = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );

      console.log(
        `Successfully registered ${Array.isArray(result) ? result.length : commands.length} guild slash commands.`
      );

      return;
    } catch (error: any) {
      console.error(`Guild command registration failed: ${error?.message ?? error}`);
      console.warn("Falling back to global command registration so the application can continue.");
    }
  }

  await registerGlobalCommands(rest, commands);
}

main().catch((error: unknown) => {
  console.error("Failed to register Discord slash commands:");
  console.error(error);
  process.exit(1);
});
