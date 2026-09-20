// src/views/EventManageView.jsx
//
// Organizer dashboard for one event (/events/:id/manage): RSVP and attendance
// statistics, an RSVPs-over-time chart, and the attendee list with filters,
// manual check-in and a CSV export. Only the organizer (or an admin) can open
// it; the database enforces the same rules through RLS and set_check_in().
// Only display_name / username / university / avatar are read from profiles
// (never date_of_birth or email).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';
import { PixelAvatar, PixelEmpty } from '../components/Pixel';
import { formatLongDate } from '../components/FeedCards';
import usePageMeta from '../lib/usePageMeta';
import { AnswersView } from '../components/Questions';

function StatTile({ label, value, sub }) {
  const { colors, radius } = themeConfig;
  return (
    <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-4`}>
      <p className={`text-3xl font-display font-bold ${colors.textWhite} leading-none`}>{value}</p>
      <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${colors.textFaint} mt-2`}>{label}</p>
      {sub && <p className={`text-[11px] ${colors.textMuted} mt-0.5`}>{sub}</p>}
    </div>
  );
}

// Pixel bar chart: RSVPs per day.
function RsvpChart({ rows }) {
  const { colors } = themeConfig;
  const days = useMemo(() => {
    const counts = new Map();
    rows.forEach((r) => {
      const d = r.created_at.slice(0, 10);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    });
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  }, [rows]);
  if (!days.length) return null;
  const max = Math.max(...days.map(([, n]) => n));
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5 h-28">
        {days.map(([d, n]) => (
          <div key={d} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d}: ${n}`}>
            <span className={`text-[10px] font-mono ${colors.textMuted}`}>{n}</span>
            <div className="w-full bg-md3-primary" style={{ height: `${Math.max(6, (n / max) * 88)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {days.map(([d]) => (
          <span key={d} className={`flex-1 text-center text-[9px] font-mono ${colors.textFaint}`}>{d.slice(8)}</span>
        ))}
      </div>
    </div>
  );
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function EventManageView() {
  const { colors, radius } = themeConfig;
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState(null);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  usePageMeta(event ? `Manage: ${event.title}` : 'Manage event');

  const load = useCallback(async () => {
    const { data: ev } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
    if (!ev) return setStatus('notFound');
    setEvent(ev);
    const { data: att, error } = await supabase
      .from('event_attendees')
      .select('id, user_id, ticket_code, checked_in_at, created_at, answers')
      .eq('event_id', id)
      .order('created_at');
    if (error) return setStatus('error');
    const ids = (att ?? []).map((a) => a.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from('profiles').select('user_id, display_name, username, university, avatar_url').in('user_id', ids)
      : { data: [] };
    setRows((att ?? []).map((a) => ({ ...a, profile: (profiles ?? []).find((p) => p.user_id === a.user_id) })));
    setStatus('ready');
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (row) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, checked_in_at: row.checked_in_at ? null : new Date().toISOString() } : r)));
    const { error } = await supabase.rpc('set_check_in', { p_attendee_id: row.id, p_checked: !row.checked_in_at });
    if (error) load();
  };

  const exportCsv = () => {
    const qs = event?.questions ?? [];
    const header = ['Name', 'Username', 'University', 'Ticket code', 'RSVP time', 'Checked in', ...qs.map((q) => q.label)];
    const lines = rows.map((r) => [
      r.profile?.display_name, r.profile?.username ? `@${r.profile.username}` : '', r.profile?.university, r.ticket_code,
      r.created_at, r.checked_in_at ?? '', ...qs.map((q) => r.answers?.[q.id] ?? ''),
    ].map(csvCell).join(','));
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(event?.title ?? 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'in' && !r.checked_in_at) return false;
      if (filter === 'out' && r.checked_in_at) return false;
      if (!q) return true;
      return [r.profile?.display_name, r.profile?.username, r.profile?.university].some((f) => f?.toLowerCase().includes(q));
    });
  }, [rows, filter, search]);

  if (status === 'loading') return <p className={`text-xs ${colors.textFaint}`}>Loading…</p>;
  if (status === 'notFound') return <p className={`text-sm ${colors.textMuted}`}>Event not found.</p>;
  if (status === 'error') return <p className={`text-sm ${colors.error}`}>Couldn&apos;t load attendees. Has 012_tickets_saves_reports_applicants.sql been run?</p>;
  if (!(isAdmin || event.posted_by_user_id === user?.id)) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-3">
        <p className={`text-sm ${colors.textMuted}`}>Only the organizer can manage this event.</p>
        <Link to={`/events/${id}`} className={`text-xs font-semibold ${colors.accent}`}>Back to the event</Link>
      </div>
    );
  }

  const total = rows.length;
  const inCount = rows.filter((r) => r.checked_in_at).length;
  const fill = event.capacity ? Math.round((total / event.capacity) * 100) : null;
  const ended = event.event_date < new Date().toLocaleDateString('en-CA');

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <SubPageHeader title="Manage event" fallbackTo={`/events/${id}`} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold ${colors.textWhite}`}>{event.title}</h2>
          <p className={`text-xs ${colors.textMuted} mt-1`}>{formatLongDate(event.event_date, event.start_time)} · {event.location}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/events/${id}/scan`} className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 ${colors.accentBg} ${colors.accentOn} ${radius.full}`}>
            <Icon name="search" size={14} className="text-inherit" /> Scan tickets
          </Link>
          <button onClick={exportCsv} disabled={!total} className={`text-xs font-bold px-4 py-2 border ${colors.borderStrong} ${colors.textWhite} ${radius.full} disabled:opacity-50`}>Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="RSVPs" value={total} sub={event.capacity ? `of ${event.capacity} seats` : undefined} />
        <StatTile label="Checked in" value={inCount} sub={total ? `${Math.round((inCount / total) * 100)}% of RSVPs` : undefined} />
        <StatTile label="Seats left" value={event.capacity ? Math.max(0, event.capacity - total) : '–'} sub={fill != null ? `${fill}% full` : undefined} />
        <StatTile label={ended ? 'No-shows' : 'Still to arrive'} value={total - inCount} />
      </div>

      {total > 0 && (
        <section className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-5 space-y-3`}>
          <h3 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider`}>RSVPs per day</h3>
          <RsvpChart rows={rows} />
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {[['all', `All (${total})`], ['in', `Checked in (${inCount})`], ['out', `Not yet (${total - inCount})`]].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} className={`text-xs font-bold px-3 py-1.5 ${radius.full} border ${filter === k ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong}`}`}>{label}</button>
            ))}
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or university…" className={`flex-1 min-w-[160px] ${colors.bgInset} border ${colors.border} ${radius.md} px-3 py-2 text-sm ${colors.textPrimary} outline-none focus:border-md3-primary`} />
        </div>

        {total === 0 && <PixelEmpty sprite="ghost" title="Nobody has RSVP'd yet">Share the event link to get people in.</PixelEmpty>}

        <div className="space-y-2">
          {shown.map((r) => (
            <div key={r.id} className={`${colors.bgCard} border ${colors.border} ${radius.md}`}>
              <div className="flex items-center gap-3 p-3">
              {r.profile?.avatar_url ? <img src={r.profile.avatar_url} alt="" className="w-9 h-9 object-cover shrink-0" /> : <PixelAvatar seed={r.user_id} size={36} />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${colors.textWhite} truncate`}>
                  {r.profile?.display_name || 'Unnamed'} {r.profile?.username && <span className={`font-normal ${colors.accent}`}>@{r.profile.username}</span>}
                </p>
                <p className={`text-[11px] ${colors.textFaint} truncate`}>{r.profile?.university || 'No school listed'} · {r.ticket_code}</p>
              </div>
              <button
                onClick={() => toggle(r)}
                className={`shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 border ${r.checked_in_at ? 'bg-md3-success/15 text-md3-success border-md3-success/40' : `${colors.textMuted} ${colors.borderStrong}`}`}
              >
                {r.checked_in_at ? 'Checked in' : 'Check in'}
              </button>
              </div>
              {event.questions?.length > 0 && (
                <div className="px-3 pb-3"><AnswersView questions={event.questions} answers={r.answers} /></div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
