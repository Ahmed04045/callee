// src/views/TicketsView.jsx
//
// "My tickets": every event you RSVP'd to, as a scannable ticket. Upcoming
// first, past ones below. Each RSVP is a ticket (a unique code lives on the
// event_attendees row, see 012_tickets_saves_reports_applicants.sql).

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabaseClient';
import usePageMeta from '../lib/usePageMeta';
import TicketCard from '../components/TicketCard';
import { CardSkeleton } from '../components/FeedCards';
import { PixelEmpty } from '../components/Pixel';
import Icon from '../components/Icon';

export default function TicketsView({ onOpenAuthModal }) {
  usePageMeta('My tickets', 'Your event tickets and QR codes.');
  const { colors, radius } = themeConfig;
  const { user, status: authStatus } = useAuth();
  const { profile } = useProfile();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    (async () => {
      const { data: tickets, error } = await supabase
        .from('event_attendees')
        .select('id, event_id, ticket_code, checked_in_at, created_at')
        .eq('user_id', user.id);
      if (error) return active && setStatus('error');
      const ids = (tickets ?? []).map((t) => t.event_id);
      const { data: events } = ids.length ? await supabase.from('events').select('*').in('id', ids) : { data: [] };
      if (!active) return;
      setRows((tickets ?? []).map((t) => ({ ticket: t, event: (events ?? []).find((e) => e.id === t.event_id) })).filter((r) => r.event));
      setStatus('ready');
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const today = new Date().toLocaleDateString('en-CA');
  const { upcoming, past } = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.event.event_date.localeCompare(b.event.event_date));
    return { upcoming: sorted.filter((r) => r.event.event_date >= today), past: sorted.filter((r) => r.event.event_date < today).reverse() };
  }, [rows, today]);

  if (authStatus === 'loading') return null;
  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <PixelEmpty sprite="box" title="Sign in to see your tickets">Your RSVPs turn into QR tickets here.</PixelEmpty>
        <button onClick={() => onOpenAuthModal?.()} className={`${colors.accentBg} ${colors.accentOn} font-bold text-sm px-5 py-2.5 ${radius.full}`}>Sign in</button>
      </div>
    );
  }

  const holder = profile?.display_name || (profile?.username ? `@${profile.username}` : user.email);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div className={`border-b ${colors.border} pb-3 flex items-end justify-between gap-4`}>
        <div>
          <h1 className={`text-xl font-bold ${colors.textWhite} flex items-center gap-2`}>
            <Icon name="event_available" size={22} className={colors.accent} /> My tickets
          </h1>
          <p className={`text-xs ${colors.textFaint} mt-1`}>Show the QR code at the door. The organizer scans it to check you in.</p>
        </div>
        <button onClick={() => window.print()} className={`text-xs font-semibold ${colors.accent} whitespace-nowrap`}>Print</button>
      </div>

      {status === 'loading' && <CardSkeleton tall />}
      {status === 'error' && <p className={`text-xs ${colors.error}`}>Couldn&apos;t load tickets. Has 012_tickets_saves_reports_applicants.sql been run?</p>}
      {status === 'ready' && rows.length === 0 && (
        <PixelEmpty sprite="ghost" title="No tickets yet">
          RSVP to an event and its ticket appears here. <Link to="/explore" className={colors.accent}>Find an event</Link>.
        </PixelEmpty>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider`}>Upcoming</h2>
          {upcoming.map(({ ticket, event }) => <TicketCard key={ticket.id} event={event} ticket={ticket} holderName={holder} />)}
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider`}>Past</h2>
          {past.map(({ ticket, event }) => <TicketCard key={ticket.id} event={event} ticket={ticket} holderName={holder} compact />)}
        </section>
      )}
    </div>
  );
}
