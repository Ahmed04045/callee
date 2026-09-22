// src/views/ClubModeratorView.jsx
//
// Workspace for club moderators (and admins): see members and the activity
// log of the clubs you moderate, and remove members. Gating is enforced by
// RLS + remove_club_member(); the checks here are UX only.
// Only display_name / avatar_url / email are read from profiles — never
// date_of_birth (see the note in 009_clubs.sql).

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { supabase } from '../lib/supabaseClient';
import SubPageHeader from '../components/SubPageHeader';
import { ACTION_LABEL, CLUB_COLUMNS, JOIN_MESSAGES, fmtDateTime } from '../lib/clubUtil';
import { AnswersView, QuestionBuilder } from '../components/Questions';
import { PixelAvatar } from '../components/Pixel';
import { cleanForSave } from '../lib/questions';
import { useT } from '../i18n';

export function LogList({ logs, showClub }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  if (!logs.length) return <p className={`text-xs ${colors.textFaint}`}>{t('No activity logged yet.')}</p>;
  return (
    <ul className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} divide-y divide-md3-outlineVariant`}>
      {logs.map((l) => (
        <li key={l.id} className="p-3 text-sm flex flex-wrap justify-between gap-x-4">
          <span className={colors.textMuted}>
            <b className={colors.textWhite}>{l.user_name}</b> · {t(ACTION_LABEL[l.action] ?? l.action)}
            {showClub && <> · {l.club_name}</>}
            {l.actor_name && <> ({t('by {name}', { name: l.actor_name })})</>}
          </span>
          <span className={`text-xs ${colors.textFaint}`}>{fmtDateTime(l.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ClubModeratorView() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { user, isAdmin, status: authStatus } = useAuth();
  const [clubId, setClubId] = useState(null);
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [actionError, setActionError] = useState('');
  const [draft, setDraft] = useState([]);
  const [savedNote, setSavedNote] = useState('');
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const { data: clubs } = useSupabaseTable('clubs', { select: CLUB_COLUMNS, filters: { status: 'approved' }, orderBy: 'name' });
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
    const [m, l, r] = await Promise.all([
      supabase.from('club_memberships').select('user_id, joined_at').eq('club_id', active),
      supabase.from('club_audit_logs').select('*').eq('club_id', active).order('created_at', { ascending: false }).limit(200),
      supabase.from('club_join_requests').select('id, user_id, message, answers, created_at').eq('club_id', active).eq('status', 'pending').order('created_at'),
    ]);
    const reqRows = r.data ?? [];
    const reqProfiles = reqRows.length
      ? (await supabase.from('profiles').select('user_id, display_name, username, email, university, bio, avatar_url').in('user_id', reqRows.map((x) => x.user_id))).data ?? []
      : [];
    setRequests(reqRows.map((x) => ({ ...x, profile: reqProfiles.find((p) => p.user_id === x.user_id) })));
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

  const activeClub = mine.find((c) => c.id === active);
  useEffect(() => {
    setDraft(activeClub?.join_questions ?? []);
    setSavedNote('');
  }, [activeClub?.id, activeClub?.join_questions]);

  const saveQuestions = async () => {
    setSavedNote('');
    const { error } = await supabase.rpc('set_join_questions', { p_club_id: active, p_questions: cleanForSave(draft) });
    setSavedNote(error ? error.message : 'Saved. New requests will see these questions.');
  };

  const review = async (request, approve) => {
    setActionError('');
    const { data, error } = await supabase.rpc('review_join_request', { p_request_id: request.id, p_approve: approve });
    if (error) setActionError(error.message);
    else if (data !== 'OK') setActionError(JOIN_MESSAGES[data] ? t(JOIN_MESSAGES[data]) : String(data));
    load();
  };

  const removeMember = async (p) => {
    const name = p.display_name || p.email || 'this member';
    if (!window.confirm(`Remove ${name} from the club? This is logged.`)) return;
    const { error } = await supabase.rpc('remove_club_member', { p_club_id: active, p_user_id: p.user_id });
    if (!error) load();
  };

  if (authStatus === 'loading' || (user && modStatus === 'loading')) {
    return <p className={`text-xs ${colors.textFaint}`}>{t('Loading…')}</p>;
  }
  if (!user || mine.length === 0) {
    return (
      <div>
        <SubPageHeader title={t('Moderator workspace')} fallbackTo="/clubs" />
        <p className={`text-sm ${colors.textMuted}`}>
          {t('You don\'t moderate any clubs yet. An admin can assign you to one.')}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <SubPageHeader title={t('Moderator workspace')} fallbackTo="/clubs" />
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
        {[['requests', t('Requests ({n})', { n: requests.length })], ['members', t('Members ({n})', { n: members.length })], ['questions', t('Questions')], ['logs', t('Activity ({n})', { n: logs.length })]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`text-xs font-semibold px-3 py-1.5 ${radius.full} ${tab === id ? colors.accentSoftBg : ''} ${colors.textWhite}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={`text-xs ${colors.textFaint}`}>{t('Loading…')}</p>
      ) : tab === 'requests' ? (
        <div className="space-y-3">
          {actionError && <p className={`text-xs ${colors.error}`}>{actionError}</p>}
          {requests.length === 0 && <p className={`text-xs ${colors.textFaint}`}>{t('No pending requests.')}</p>}
          {requests.map((r) => (
            <div key={r.id} className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-4 space-y-3`}>
              <div className="flex items-start gap-3">
                {r.profile?.avatar_url ? <img src={r.profile.avatar_url} alt="" className="w-10 h-10 object-cover shrink-0" /> : <PixelAvatar seed={r.user_id} size={40} />}
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${colors.textWhite}`}>
                    {r.profile?.display_name || t('Unnamed')}{' '}
                    {r.profile?.username && <Link to={`/u/${r.profile.username}`} className={`font-normal ${colors.accent}`}>@{r.profile.username}</Link>}
                  </p>
                  <p className={`text-xs ${colors.textFaint}`}>{r.profile?.university || t('No school listed')} · {fmtDateTime(r.created_at)}</p>
                  {r.profile?.email && <p className={`text-[11px] ${colors.textFaint}`}>{r.profile.email}</p>}
                  {r.profile?.bio && <p className={`text-xs ${colors.textMuted} mt-1`}>{r.profile.bio}</p>}
                </div>
              </div>
              {r.message && <p className={`text-xs ${colors.textMuted} ${colors.bgInset} p-3 whitespace-pre-line`}>{r.message}</p>}
              <AnswersView questions={activeClub?.join_questions} answers={r.answers} />
              <div className="flex gap-2">
                <button onClick={() => review(r, true)} className={`text-xs font-bold px-3 py-1.5 ${radius.full} ${colors.accentBg} ${colors.accentOn}`}>{t('Approve')}</button>
                <button onClick={() => review(r, false)} className={`text-xs font-bold px-3 py-1.5 ${radius.full} border ${colors.borderStrong} ${colors.error}`}>{t('Decline')}</button>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'questions' ? (
        <div className="space-y-4">
          <p className={`text-xs ${colors.textFaint}`}>{t('Questions people answer when they ask to join this club. You see the answers on each request.')}</p>
          <QuestionBuilder value={draft} onChange={setDraft} />
          <div className="flex items-center gap-3">
            <button onClick={saveQuestions} className={`${colors.accentBg} ${colors.accentOn} text-xs font-bold px-4 py-2 ${radius.full}`}>{t('Save questions')}</button>
            {savedNote && <span className={`text-xs ${colors.textMuted}`}>{savedNote}</span>}
          </div>
        </div>
      ) : tab === 'members' ? (
        members.length ? (
          <ul className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} divide-y divide-md3-outlineVariant`}>
            {members.map((p) => (
              <li key={p.user_id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${colors.textWhite} truncate`}>{p.display_name || t('Unnamed')}</p>
                  <p className={`text-xs ${colors.textFaint} truncate`}>{p.email}</p>
                </div>
                {p.user_id !== user.id && (
                  <button onClick={() => removeMember(p)} className={`text-xs font-semibold ${colors.error}`}>{t('Remove')}</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-xs ${colors.textFaint}`}>{t('Nobody has joined this club yet.')}</p>
        )
      ) : (
        <LogList logs={logs} />
      )}
    </div>
  );
}
