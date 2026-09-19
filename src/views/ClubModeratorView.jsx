// src/views/ClubModeratorView.jsx
//
// Workspace for club moderators (and admins): see members and the activity
// log of the clubs you moderate, and remove members. Gating is enforced by
// RLS + remove_club_member(); the checks here are UX only.
// Only display_name / avatar_url / email are read from profiles — never
// date_of_birth (see the note in 009_clubs.sql).

import React, { useCallback, useEffect, useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { supabase } from '../lib/supabaseClient';
import SubPageHeader from '../components/SubPageHeader';
import { ACTION_LABEL, CLUB_COLUMNS, fmtDateTime } from '../lib/clubUtil';

export function LogList({ logs, showClub }) {
  const { colors, radius } = themeConfig;
  if (!logs.length) return <p className={`text-xs ${colors.textFaint}`}>No activity logged yet.</p>;
  return (
    <ul className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} divide-y divide-md3-outlineVariant`}>
      {logs.map((l) => (
        <li key={l.id} className="p-3 text-sm flex flex-wrap justify-between gap-x-4">
          <span className={colors.textMuted}>
            <b className={colors.textWhite}>{l.user_name}</b> · {ACTION_LABEL[l.action] ?? l.action}
            {showClub && <> · {l.club_name}</>}
            {l.actor_name && <> (by {l.actor_name})</>}
          </span>
          <span className={`text-xs ${colors.textFaint}`}>{fmtDateTime(l.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ClubModeratorView() {
  const { colors, radius } = themeConfig;
  const { user, isAdmin, status: authStatus } = useAuth();
  const [clubId, setClubId] = useState(null);
  const [tab, setTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const { data: clubs } = useSupabaseTable('clubs', { select: CLUB_COLUMNS, orderBy: 'name' });
  const { data: moderated, status: modStatus } = useSupabaseTable('club_moderators', {
    select: 'club_id',
    filters: user ? { user_id: user.id } : undefined,
    enabled: Boolean(user),
  });

  const mine = clubs.filter((c) => isAdmin || moderated.some((m) => m.club_id === c.id));
  const active = clubId ?? mine[0]?.id;

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    const [m, l] = await Promise.all([
      supabase.from('club_memberships').select('user_id, joined_at').eq('club_id', active),
      supabase.from('club_audit_logs').select('*').eq('club_id', active).order('created_at', { ascending: false }).limit(200),
    ]);
    const ids = (m.data ?? []).map((r) => r.user_id);
    const profiles = ids.length
      ? (await supabase.from('profiles').select('user_id, display_name, avatar_url, email').in('user_id', ids)).data ?? []
      : [];
    setMembers(profiles);
    setLogs(l.data ?? []);
    setLoading(false);
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  const removeMember = async (p) => {
    const name = p.display_name || p.email || 'this member';
    if (!window.confirm(`Remove ${name} from the club? This is logged.`)) return;
    const { error } = await supabase.rpc('remove_club_member', { p_club_id: active, p_user_id: p.user_id });
    if (!error) load();
  };

  if (authStatus === 'loading' || (user && modStatus === 'loading')) {
    return <p className={`text-xs ${colors.textFaint}`}>Loading…</p>;
  }
  if (!user || mine.length === 0) {
    return (
      <div>
        <SubPageHeader title="Moderator workspace" fallbackTo="/clubs" />
        <p className={`text-sm ${colors.textMuted}`}>
          You don't moderate any clubs yet. An admin can assign you to one.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <SubPageHeader title="Moderator workspace" fallbackTo="/clubs" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {mine.map((c) => (
          <button key={c.id} onClick={() => setClubId(c.id)}
            className={`text-xs font-medium whitespace-nowrap px-3.5 py-1.5 ${radius.full} border ${
              active === c.id ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.border} ${colors.textMuted}`
            }`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {[['members', `Members (${members.length})`], ['logs', `Activity (${logs.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`text-xs font-semibold px-3 py-1.5 ${radius.full} ${tab === id ? colors.accentSoftBg : ''} ${colors.textWhite}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={`text-xs ${colors.textFaint}`}>Loading…</p>
      ) : tab === 'members' ? (
        members.length ? (
          <ul className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} divide-y divide-md3-outlineVariant`}>
            {members.map((p) => (
              <li key={p.user_id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${colors.textWhite} truncate`}>{p.display_name || 'Unnamed'}</p>
                  <p className={`text-xs ${colors.textFaint} truncate`}>{p.email}</p>
                </div>
                {p.user_id !== user.id && (
                  <button onClick={() => removeMember(p)} className={`text-xs font-semibold ${colors.error}`}>Remove</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-xs ${colors.textFaint}`}>Nobody has joined this club yet.</p>
        )
      ) : (
        <LogList logs={logs} />
      )}
    </div>
  );
}
