// src/hooks/useMyActivity.js
//
// Everything the personal Home shows about the signed-in user: events they're
// going to / have been to (event_attendees), clubs they've joined
// (club_memberships), gigs they applied to (applications) and pending club
// join requests. Every table involved is already readable by its owner under
// RLS, so this only ever returns the caller's own rows.
//
// Like useSupabaseTable, the last result per user is kept in memory so
// returning to Home shows it instantly and refreshes quietly in the background.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CLUB_COLUMNS } from '../lib/clubUtil';

const cache = new Map();

const todayLocalISO = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time

async function byIds(table, ids, select = '*') {
  if (!ids.length) return [];
  const { data } = await supabase.from(table).select(select).in('id', ids);
  return data ?? [];
}

async function load(userId) {
  const [att, mem, app, req, sav] = await Promise.all([
    supabase.from('event_attendees').select('event_id').eq('user_id', userId),
    supabase.from('club_memberships').select('club_id').eq('user_id', userId),
    supabase.from('applications').select('gig_id, status, created_at').eq('user_id', userId),
    supabase.from('club_join_requests').select('club_id').eq('user_id', userId).eq('status', 'pending'),
    supabase.from('saved_items').select('kind, item_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
  ]);
  const savedRows = sav.data ?? [];
  const idsOf = (kind) => savedRows.filter((r) => r.kind === kind).map((r) => r.item_id);

  const [events, clubs, gigs, savedEvents, savedGigs, savedClubs] = await Promise.all([
    byIds('events', (att.data ?? []).map((r) => r.event_id)),
    byIds('clubs', (mem.data ?? []).map((r) => r.club_id), CLUB_COLUMNS),
    byIds('gigs', (app.data ?? []).map((r) => r.gig_id)),
    byIds('events', idsOf('event')),
    byIds('gigs', idsOf('gig')),
    byIds('clubs', idsOf('club'), CLUB_COLUMNS),
  ]);
  const saved = savedRows
    .map((r) => {
      const item = (r.kind === 'event' ? savedEvents : r.kind === 'gig' ? savedGigs : savedClubs).find((x) => x.id === r.item_id);
      return item ? { kind: r.kind, item } : null;
    })
    .filter(Boolean);

  const today = todayLocalISO();
  const going = events.filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const attended = events.filter((e) => e.event_date < today).sort((a, b) => b.event_date.localeCompare(a.event_date));
  const applications = (app.data ?? [])
    .map((a) => ({ ...a, gig: gigs.find((g) => g.id === a.gig_id) }))
    .filter((a) => a.gig)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  return { going, attended, clubs, applications, saved, pendingRequests: (req.data ?? []).length };
}

const EMPTY = { going: [], attended: [], clubs: [], applications: [], saved: [], pendingRequests: 0 };

export function useMyActivity(userId) {
  const cached = userId ? cache.get(userId) : null;
  const [data, setData] = useState(cached ?? EMPTY);
  const [status, setStatus] = useState(cached ? 'ready' : userId ? 'loading' : 'idle');

  const refetch = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await load(userId);
      cache.set(userId, result);
      setData(result);
      setStatus('ready');
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error'));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setData(EMPTY);
      setStatus('idle');
      return;
    }
    const c = cache.get(userId);
    setData(c ?? EMPTY);
    setStatus(c ? 'ready' : 'loading');
    refetch();
  }, [userId, refetch]);

  return { ...data, status, refetch };
}
