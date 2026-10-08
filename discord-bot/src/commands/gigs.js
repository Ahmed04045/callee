// src/commands/gigs.js
//
// /gigs [query] [remote]: open approved gigs whose deadline has not passed.

const { SlashCommandBuilder } = require('discord.js');
const { supabase } = require('../supabaseClient');
const { SITE_URL, embed, safeQuery, clip, md, todayISO } = require('../lib/site');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gigs')
    .setDescription('Browse open gigs and collaborations')
    .addStringOption((opt) => opt.setName('query').setDescription('Search by role, team or tag').setRequired(false))
    .addBooleanOption((opt) => opt.setName('remote').setDescription('Only remote gigs').setRequired(false)),

  async execute(interaction) {
    const query = safeQuery(interaction.options.getString('query'));
    const remoteOnly = interaction.options.getBoolean('remote');

    let request = supabase
      .from('gigs')
      .select('id, role, posted_by, compensation, location, is_remote, deadline')
      .eq('status', 'approved')
      .or(`deadline.is.null,deadline.gte.${todayISO()}`)
      .order('created_at', { ascending: false })
      .limit(8);
    if (remoteOnly) request = request.eq('is_remote', true);
    if (query) request = request.or(`role.ilike.%${query}%,posted_by.ilike.%${query}%`);

    const { data, error } = await request;
    if (error) throw error;

    if (!data?.length) {
      await interaction.reply({
        content: query ? `No open gigs match "${query}".` : 'No open gigs right now.',
        ephemeral: true,
      });
      return;
    }

    const lines = data.map((g) => {
      const where = g.is_remote ? 'Remote' : g.location ? md(clip(g.location, 40)) : null;
      const bits = [md(clip(g.posted_by, 40)), g.compensation, where].filter(Boolean).join(' · ');
      const closes = g.deadline ? `\nCloses ${g.deadline}` : '';
      return `**[${md(clip(g.role, 80))}](${SITE_URL}/gigs/${g.id})**\n${bits}${closes}`;
    });

    await interaction.reply({
      embeds: [
        embed()
          .setTitle(query ? `Gigs matching "${clip(query, 40)}"` : 'Open gigs')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: 'Apply on the website. The poster may ask a few questions' }),
      ],
    });
  },
};
