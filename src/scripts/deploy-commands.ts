import { REST, Routes } from "discord.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token) {
  throw new Error("Missing DISCORD_TOKEN");
}

if (!clientId) {
  throw new Error("Missing DISCORD_CLIENT_ID");
}

async function loadCommands(): Promise<unknown[]> {
  const commands: unknown[] = [];
  const commandsDir = join(process.cwd(), "dist", "bot", "commands");

  const commandFiles = (await readdir(commandsDir))
    .filter((file) => file.endsWith(".js") && !file.endsWith(".map"));

  for (const file of commandFiles) {
    const filePath = join(commandsDir, file);
    const command = await import(pathToFileURL(filePath).href);

    if (command.data && typeof command.data.toJSON === "function") {
      commands.push(command.data.toJSON());
      console.log(`Loaded command: /${command.data.name}`);
    } else {
      console.warn(`Skipping ${file}: missing export 'data'`);
    }
  }

  return commands;
}

async function main(): Promise<void> {
  const commands = await loadCommands();

  if (commands.length === 0) {
    throw new Error("No slash commands were found in dist/bot/commands");
  }

  const rest = new REST({ version: "10" }).setToken(token);

  console.log(`Registering ${commands.length} global slash commands...`);

  const globalResult = await rest.put(
    Routes.applicationCommands(clientId),
    { body: commands }
  ) as unknown[];

  console.log(
    `Successfully registered ${globalResult.length} global slash commands.`
  );

  if (guildId) {
    console.log(
      `Registering ${commands.length} commands in development guild ${guildId}...`
    );

    const guildResult = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    ) as unknown[];

    console.log(
      `Successfully registered ${guildResult.length} guild slash commands.`
    );
  }
}

main().catch((error: unknown) => {
  console.error("Failed to register Discord slash commands:");
  console.error(error);
  process.exit(1);
});