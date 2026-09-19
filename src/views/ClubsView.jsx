// src/views/ClubsView.jsx
//
// Circosodal: browse university clubs. Public read; joining needs an account.

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { CLUB_COLUMNS, MAX_CLUBS } from '../lib/clubUtil';
import ClubCard from '../components/ClubCard';
import Icon from '../components/Icon';

export default function ClubsView() {
  const { colors, radius } = themeConfig;
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const { data: clubs, status } = useSupabaseTable('clubs', { select: CLUB_COLUMNS, orderBy: 'name' });
  const { data: memberships } = useSupabaseTable('club_memberships', {
    select: 'club_id',
    filters: user ? { user_id: user.id } : undefined,
    enabled: Boolean(user),
  });
  const joinedIds = useMemo(() => new Set(memberships.map((m) => m.club_id)), [memberships]);

  const categories = useMemo(() => ['All', ...[...new Set(clubs.map((c) => c.category))].sort()], [clubs]);
  const shown = clubs.filter((c) => {
    const q = query.trim().toLowerCase();
    return (
      (category === 'All' || c.category === category) &&
      (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 w-full">
      <div className={`border-b ${colors.border} pb-3 flex items-end justify-between gap-4`}>
        <div>
          <h2 className={`text-xl font-bold ${colors.textWhite}`}>University Clubs</h2>
          <p className={`text-xs ${colors.textFaint} mt-1`}>
            {clubs.length} clubs at UDST. Join up to {MAX_CLUBS} to unlock their WhatsApp and Discord communities.
          </p>
        </div>
        {user && (
          <Link to="/clubs/moderator" className={`text-xs font-semibold ${colors.accent} whitespace-nowrap`}>
            Moderator workspace
          </Link>
        )}
      </div>

      <div className="relative">
        <Icon name="search" size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${colors.textFaint}`} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by club name or interests..."
          className={`w-full ${colors.bgInset} border ${colors.border} ${radius.md} pl-10 pr-3 py-2.5 text-sm ${colors.textWhite} outline-none focus:border-md3-primary`}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`text-xs font-medium whitespace-nowrap px-3.5 py-1.5 ${radius.full} border transition ${
              category === c ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.border} ${colors.textMuted}`
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {status === 'loading' && <p className={`text-xs ${colors.textFaint}`}>Loading clubs…</p>}
      {status === 'error' && (
        <p className={`text-xs ${colors.error}`}>Couldn't load clubs. Has 009_clubs.sql been run?</p>
      )}
      {status === 'ready' && shown.length === 0 && (
        <p className={`text-xs ${colors.textFaint}`}>No clubs match that search.</p>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map((c) => (
          <ClubCard key={c.id} club={c} joined={joinedIds.has(c.id)} />
        ))}
      </div>
    </div>
  );
}
