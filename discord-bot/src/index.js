// src/index.js

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { handleModalSubmit } = require('./handlers/modalSubmit');
const { handleButtonInteraction } = require('./handlers/buttonInteraction');

if (!process.env.DISCORD_TOKEN) {
  throw new Error('Missing DISCORD_TOKEN. Copy .env.example to .env and fill it in.');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
  } catch (err) {
    console.error(err);
    const errorReply = { content: 'Something went wrong. Try again in a moment.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errorReply).catch(() => {});
    } else {
      await interaction.reply(errorReply).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
