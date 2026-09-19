// src/views/admin/AdminModerators.jsx
//
// Assign / remove club moderators. The real gate is is_admin() inside the
// database functions and RLS (AdminLayout only decides what to show).

import React, { useCallback, useEffect, useState } from 'react';
import themeConfig from '../../theme/themeConfig';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { CLUB_COLUMNS } from '../../lib/clubUtil';

export default function AdminModerators() {
  const { colors, radius } = themeConfig;
  const [mods, setMods] = useState([]);
  const [invites, setInvites] = useState([]);
  const [people, setPeople] = useState([]);
  const [assignFor, setAssignFor] = useState(null);
  const [ident, setIdent] = useState('');
  const [msg, setMsg] = useState('');

  const { data: clubs } = useSupabaseTable('clubs', { select: CLUB_COLUMNS, filters: { status: 'approved' }, orderBy: 'name' });

  const load = useCallback(async () => {
    const [m, i, p] = await Promise.all([
      supabase.from('club_moderators').select('club_id, user_id'),
      supabase.from('club_moderator_invites').select('club_id, email'),
      supabase.from('profiles').select('user_id, display_name, email').order('display_name'),
    ]);
    setMods(m.data ?? []);
    setInvites(i.data ?? []);
    setPeople(p.data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (id) => {
    const p = people.find((x) => x.user_id === id);
    return p?.display_name || p?.email || id.slice(0, 8);
  };

  const assign = async () => {
    setMsg('');
    const { data, error } = await supabase.rpc('assign_club_moderator', { p_club_id: assignFor.id, p_identifier: ident });
    if (error) setMsg(error.message);
    else if (!data) setMsg('Could not assign — enter a registered user id or an email.');
    else {
      setAssignFor(null);
      setIdent('');
      load();
    }
  };

  const remove = async (clubId, userId) => {
    if (!window.confirm(`Remove ${nameOf(userId)} as moderator?`)) return;
    await supabase.rpc('remove_club_moderator', { p_club_id: clubId, p_user_id: userId });
    load();
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>Moderators</h2>
        <p className={`text-xs ${colors.textFaint} mt-1`}>Moderators approve join requests and manage members for their own clubs.</p>
      </div>
      <div className="space-y-3">
        {clubs.map((c) => (
          <div key={c.id} className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <p className={`font-bold ${colors.textWhite}`}>
                {c.name} <span className={`text-xs font-normal ${colors.textFaint}`}>· {c.member_count} members</span>
              </p>
              <button onClick={() => { setAssignFor(c); setMsg(''); }} className={`text-xs font-semibold ${colors.accent}`}>
                + Assign moderator
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {mods.filter((m) => m.club_id === c.id).map((m) => (
                <button key={m.user_id} onClick={() => remove(c.id, m.user_id)} title="Remove moderator"
                  className={`text-xs ${colors.textMuted} border ${colors.border} ${radius.full} px-3 py-1`}>
                  {nameOf(m.user_id)} ✕
                </button>
              ))}
              {invites.filter((i) => i.club_id === c.id).map((i) => (
                <span key={i.email} className={`text-xs italic ${colors.textFaint} border ${colors.border} ${radius.full} px-3 py-1`}>
                  {i.email} (invited)
                </span>
              ))}
            </div>
            {assignFor?.id === c.id && (
              <div className="mt-3 space-y-2">
                <input value={ident} onChange={(e) => setIdent(e.target.value)} placeholder="Student email or user id"
                  className={`w-full ${colors.bgInset} border ${colors.border} ${radius.md} px-3 py-2 text-sm ${colors.textWhite} outline-none`} />
                <div className="flex gap-2 items-center">
                  <button onClick={assign} className={`${colors.accentBg} ${colors.accentOn} text-xs font-bold px-4 py-2 ${radius.full}`}>Assign</button>
                  <button onClick={() => setAssignFor(null)} className={`text-xs ${colors.textFaint}`}>Cancel</button>
                  {msg && <span className={`text-xs ${colors.error}`}>{msg}</span>}
                </div>
                <p className={`text-[11px] ${colors.textFaint}`}>
                  If nobody has registered with that email yet, they become a moderator automatically when they sign up.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
