// src/commands/connect.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { supabase } = require('../supabaseClient');
const { SITE_URL } = require('../lib/site');

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids ambiguity when read aloud/typed

function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('connect')
    .setDescription('Link your Discord account to your Circosodal profile'),

  async execute(interaction) {
    const code = generateCode();

    const { error } = await supabase.from('connect_codes').insert({
      code,
      discord_user_id: interaction.user.id,
      discord_username: interaction.user.username,
    });

    if (error) {
      await interaction.reply({
        content: "Couldn't generate a code just now — try again in a moment.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x3d8bff)
      .setTitle('Connect your account')
      .setDescription(
        `Go to **${SITE_URL}/connect-discord**, sign in, and enter this code:\n\n\`\`\`${code}\`\`\`\n\nExpires in 10 minutes.`
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
