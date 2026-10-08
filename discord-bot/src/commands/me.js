// src/commands/me.js
//
// /me: a private summary for the linked account: upcoming tickets, application
// statuses, pending club requests and unread notifications. Always ephemeral,
// so nothing personal is posted in the channel.

const { SlashCommandBuilder } = require('discord.js');
const { supabase } = require('../supabaseClient');
const { getLinkedAccount, NOT_LINKED_MESSAGE } = require('../lib/account');
const { SITE_URL, embed, clip, md, todayISO, formatDay } = require('../lib/site');

const STATUS = { submitted: 'Applied', reviewing: 'In review', shortlisted: 'Shortlisted', accepted: 'Accepted', rejected: 'Not selected' };

module.exports = {
  data: new SlashCommandBuilder().setName('me').setDescription('Your tickets, applications and notifications (only you see this)'),

  async execute(interaction) {
    const account = await getLinkedAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({ content: NOT_LINKED_MESSAGE, ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const uid = account.user_id;

    const [profile, rsvps, applications, requests, unread] = await Promise.all([
      supabase.from('profiles').select('display_name, username').eq('user_id', uid).maybeSingle(),
      supabase.from('event_attendees').select('event_id, checked_in_at, events(id, title, event_date, start_time)').eq('user_id', uid),
      supabase.from('applications').select('status, created_at, gigs(id, role)').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
      supabase.from('club_join_requests').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'pending'),
      supabase.from('notifications').select('title, body', { count: 'exact' }).eq('user_id', uid).is('read_at', null).order('created_at', { ascending: false }).limit(3),
    ]);

    const today = todayISO();
    const tickets = (rsvps.data ?? [])
      .map((r) => r.events)
      .filter((e) => e && e.event_date >= today)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 5);

    const name = profile.data?.display_name || (profile.data?.username ? `@${profile.data.username}` : interaction.user.username);
    const card = embed().setTitle(`Hi ${clip(name, 40)}`).setURL(`${SITE_URL}/activity`);

    card.addFields({
      name: 'Upcoming tickets',
      value: tickets.length
        ? tickets.map((e) => `[${md(clip(e.title, 60))}](${SITE_URL}/tickets) · ${formatDay(e.event_date, e.start_time)}`).join('\n')
        : 'None. Find something on /events.',
    });

    const apps = (applications.data ?? []).filter((a) => a.gigs);
    card.addFields({
      name: 'Your applications',
      value: apps.length ? apps.map((a) => `${md(clip(a.gigs.role, 60))} · ${STATUS[a.status] ?? a.status}`).join('\n') : 'None yet. Try /gigs.',
    });

    if (requests.count) card.addFields({ name: 'Club requests', value: `${requests.count} waiting for a moderator` });

    const notes = unread.data ?? [];
    card.addFields({
      name: `Unread notifications${unread.count ? ` (${unread.count})` : ''}`,
      value: notes.length ? notes.map((n) => `${md(clip(n.title, 60))}${n.body ? ` · ${md(clip(n.body, 60))}` : ''}`).join('\n') : 'All caught up.',
    });

    await interaction.editReply({ embeds: [card] });
  },
};
