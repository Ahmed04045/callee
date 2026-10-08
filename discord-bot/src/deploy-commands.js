// src/deploy-commands.js
//
// Run with `npm run deploy-commands` any time a command is added or
// changed. Registers to a single guild (your server) rather than
// globally — guild commands update instantly; global commands can take
// up to an hour to propagate everywhere, which is annoying during
// development. Switch to Routes.applicationCommands(clientId) (no guild
// id) once this is stable and you want it usable in multiple servers.

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing env vars: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands to guild ${process.env.DISCORD_GUILD_ID}...`);
    await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), {
      body: commands,
    });
    console.log('Done — commands should show up in Discord immediately.');
  } catch (err) {
    console.error(err);
  }
})();
