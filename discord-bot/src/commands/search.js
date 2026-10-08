// src/commands/search.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { supabase } = require('../supabaseClient');

// Where profile links point. Override with SITE_URL in the bot's .env if the domain changes.
const SITE_URL = (process.env.SITE_URL || 'https://callee-sooty.vercel.app').replace(/\/$/, '');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for a student or a startup')
    .addSubcommand((sub) =>
      sub
        .setName('user')
        .setDescription('Search for a student by name')
        .addStringOption((opt) => opt.setName('query').setDescription('Name to search for').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('startup')
        .setDescription('Search for a startup by name')
        .addStringOption((opt) => opt.setName('query').setDescription('Name to search for').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const query = interaction.options.getString('query');

    if (sub === 'user') {
      // Only profiles that opted in via the "Discoverable via /search"
      // toggle on the website — profiles are otherwise private, and this
      // bot deliberately doesn't override that default.
      // Match the display name OR the @username. Characters that mean something
      // inside a PostgREST filter string are stripped so a query can't alter it.
      // Profiles set to private on the website (is_public = false) are skipped
      // even if they ticked "discoverable".
      const safe = query.replace(/[,()%*\\]/g, ' ').replace(/^@/, '').trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, username, university, bio')
        .eq('discoverable', true)
        .eq('is_public', true)
        .or(`display_name.ilike.%${safe}%,username.ilike.%${safe}%`)
        .limit(10);

      if (error || !data?.length) {
        await interaction.reply({
          content: 'No discoverable students found matching that name.',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x3d8bff)
        .setTitle(`Students matching "${query}"`)
        .setDescription(
          data
            .map(
              (p) =>
                `**${p.display_name ?? `@${p.username}`}**${
                  p.username ? ` ([@${p.username}](${SITE_URL}/u/${p.username}))` : ''
                }${p.university ? ` — ${p.university}` : ''}${p.bio ? `\n${p.bio.slice(0, 120)}` : ''}`
            )
            .join('\n\n')
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'startup') {
      const { data, error } = await supabase
        .from('startups')
        .select('name, description')
        .eq('status', 'approved')
        .ilike('name', `%${query}%`)
        .limit(10);

      if (error || !data?.length) {
        await interaction.reply({ content: 'No approved startups found matching that name.', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x3d8bff)
        .setTitle(`Startups matching "${query}"`)
        .setDescription(data.map((s) => `**${s.name}**\n${(s.description ?? '').slice(0, 150)}`).join('\n\n'));

      await interaction.reply({ embeds: [embed] });
    }
  },
};
