// src/commands/events.js
//
// /events [query]: upcoming approved events, soonest first, each linking to its page.

const { SlashCommandBuilder } = require('discord.js');
const { supabase } = require('../supabaseClient');
const { SITE_URL, embed, safeQuery, clip, md, todayISO, formatDay } = require('../lib/site');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription('See upcoming events')
    .addStringOption((opt) => opt.setName('query').setDescription('Search by name, type or place').setRequired(false)),

  async execute(interaction) {
    const query = safeQuery(interaction.options.getString('query'));

    let request = supabase
      .from('events')
      .select('id, title, event_date, start_time, location, event_type')
      .eq('status', 'approved')
      .gte('event_date', todayISO())
      .order('event_date')
      .order('start_time', { nullsFirst: false })
      .limit(8);
    if (query) request = request.or(`title.ilike.%${query}%,location.ilike.%${query}%,event_type.ilike.%${query}%`);

    const { data, error } = await request;
    if (error) throw error;

    if (!data?.length) {
      await interaction.reply({
        content: query ? `No upcoming events match "${query}".` : 'No upcoming events yet. Be the first to post one on the site.',
        ephemeral: true,
      });
      return;
    }

    const lines = data.map((e) => {
      const where = e.location ? ` · ${md(clip(e.location, 50))}` : '';
      const type = e.event_type ? ` · ${md(e.event_type)}` : '';
      return `**[${md(clip(e.title, 80))}](${SITE_URL}/events/${e.id})**\n${formatDay(e.event_date, e.start_time)}${where}${type}`;
    });

    await interaction.reply({
      embeds: [
        embed()
          .setTitle(query ? `Events matching "${clip(query, 40)}"` : 'Upcoming events')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: 'RSVP and get your QR ticket on the website' }),
      ],
    });
  },
};
