// src/commands/clubs.js
//
// /clubs [query] [university]: approved clubs and groups. Clubs are private, so
// this only shows the public card (name, category, size) and points to the site
// where people request to join. Private WhatsApp/Discord links are never shown.

const { SlashCommandBuilder } = require('discord.js');
const { supabase } = require('../supabaseClient');
const { SITE_URL, embed, safeQuery, clip, md } = require('../lib/site');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clubs')
    .setDescription('Find university clubs and groups')
    .addStringOption((opt) => opt.setName('query').setDescription('Search by name or category').setRequired(false))
    .addStringOption((opt) => opt.setName('university').setDescription('Only clubs at this university').setRequired(false)),

  async execute(interaction) {
    const query = safeQuery(interaction.options.getString('query'));
    const university = safeQuery(interaction.options.getString('university'));

    let request = supabase
      .from('clubs')
      .select('id, name, category, university, description, member_count')
      .eq('status', 'approved')
      .order('member_count', { ascending: false })
      .limit(8);
    if (university) request = request.ilike('university', `%${university}%`);
    if (query) request = request.or(`name.ilike.%${query}%,category.ilike.%${query}%`);

    const { data, error } = await request;
    if (error) throw error;

    if (!data?.length) {
      await interaction.reply({ content: 'No clubs found for that search.', ephemeral: true });
      return;
    }

    const lines = data.map((c) => {
      const meta = [c.category, c.university, `${c.member_count ?? 0} members`].filter(Boolean).map(md).join(' · ');
      const blurb = c.description ? `\n${md(clip(c.description, 110))}` : '';
      return `**[${md(clip(c.name, 70))}](${SITE_URL}/clubs/${c.id})**\n${meta}${blurb}`;
    });

    await interaction.reply({
      embeds: [
        embed()
          .setTitle(query || university ? 'Clubs found' : 'Clubs')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: 'Clubs are private. Request to join on the website' }),
      ],
    });
  },
};
