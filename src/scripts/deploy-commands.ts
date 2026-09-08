import { REST, Routes } from "discord.js";
import { modules } from "../bot/command-loader.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const token = requireEnv("DISCORD_TOKEN");
const clientId = requireEnv("DISCORD_CLIENT_ID");
const guildId = process.env.DISCORD_GUILD_ID;

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

async function main(): Promise<void> {
  const commands = loadCommands();

  if (!commands.length) {
    throw new Error("No slash commands were loaded.");
  }

  const rest = new REST({ version: "10" }).setToken(token);

  console.log(`Registering ${commands.length} unique slash commands...`);

  if (guildId) {
    const result = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(
      `Successfully registered ${Array.isArray(result) ? result.length : commands.length} guild slash commands.`
    );
  } else {
    const result = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log(
      `Successfully registered ${Array.isArray(result) ? result.length : commands.length} global slash commands.`
    );
  }
}

main().catch((error: unknown) => {
  console.error("Failed to register Discord slash commands:");
  console.error(error);
  process.exit(1);
});
