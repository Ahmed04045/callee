// src/views/ApplicantsView.jsx
//
// For the person who posted a gig (/gigs/:id/applicants): see everyone who
// applied and move them through a simple pipeline
// (Applied → In review → Shortlisted → Accepted / Not selected). Applicants get
// a notification when their status changes (trigger in 012). Only the poster
// (or an admin) can open it; RLS enforces that on the database side too. Only
// safe profile columns are read: name, username, university, bio, avatar.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import SubPageHeader from '../components/SubPageHeader';
import { PixelAvatar, PixelEmpty } from '../components/Pixel';
import usePageMeta from '../lib/usePageMeta';
import { AnswersView } from '../components/Questions';
import { APPLICATION_CONTACT_METHODS } from '../lib/options';
import Icon from '../components/Icon';

export const APPLICATION_STAGES = [
  ['submitted', 'Applied'],
  ['reviewing', 'In review'],
  ['shortlisted', 'Shortlisted'],
  ['accepted', 'Accepted'],
  ['rejected', 'Not selected'],
];

export default function ApplicantsView() {
  const { colors, radius } = themeConfig;
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [gig, setGig] = useState(null);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [filter, setFilter] = useState('all');
  usePageMeta(gig ? `Applicants: ${gig.role}` : 'Applicants');

  const load = useCallback(async () => {
    const { data: g } = await supabase.from('gigs').select('id, role, posted_by_user_id, questions').eq('id', id).maybeSingle();
    if (!g) return setStatus('notFound');
    setGig(g);
    const { data: apps, error } = await supabase.from('applications').select('id, user_id, status, created_at, answers, message, contact_method, contact_value').eq('gig_id', id).order('created_at', { ascending: false });
    if (error) return setStatus('error');
    const ids = (apps ?? []).map((a) => a.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from('profiles').select('user_id, display_name, username, university, bio, avatar_url').in('user_id', ids)
      : { data: [] };
    setRows((apps ?? []).map((a) => ({ ...a, profile: (profiles ?? []).find((p) => p.user_id === a.user_id) })));
    setStatus('ready');
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const setStage = async (row, next) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    const { error } = await supabase.from('applications').update({ status: next }).eq('id', row.id);
    if (error) load();
  };

  const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const exportCsv = () => {
    const qs = gig?.questions ?? [];
    const header = ['Name', 'Username', 'University', 'Status', 'Applied', 'Contact', 'Message', ...qs.map((q) => q.label)];
    const lines = rows.map((r) => [
      r.profile?.display_name, r.profile?.username ? `@${r.profile.username}` : '', r.profile?.university, r.status, r.created_at,
      r.contact_method ? `${r.contact_method}: ${r.contact_value}` : '', r.message, ...qs.map((q) => r.answers?.[q.id] ?? ''),
    ].map(csvCell).join(','));
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(gig?.role ?? 'gig').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-applicants.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = useMemo(() => Object.fromEntries(APPLICATION_STAGES.map(([k]) => [k, rows.filter((r) => r.status === k).length])), [rows]);
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  if (status === 'loading') return <p className={`text-xs ${colors.textFaint}`}>Loading…</p>;
  if (status === 'notFound') return <p className={`text-sm ${colors.textMuted}`}>Gig not found.</p>;
  if (status === 'error') return <p className={`text-sm ${colors.error}`}>Couldn&apos;t load applicants. Has 012_tickets_saves_reports_applicants.sql been run?</p>;
  if (!(isAdmin || gig.posted_by_user_id === user?.id)) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-3">
        <p className={`text-sm ${colors.textMuted}`}>Only the person who posted this gig can see its applicants.</p>
        <Link to={`/gigs/${id}`} className={`text-xs font-semibold ${colors.accent}`}>Back to the gig</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <SubPageHeader title="Applicants" fallbackTo={`/gigs/${id}`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${colors.textMuted}`}>{gig.role}</p>
        <button onClick={exportCsv} disabled={!rows.length} className={`text-xs font-bold px-4 py-2 border ${colors.borderStrong} ${colors.textWhite} ${radius.full} disabled:opacity-50`}>Export CSV</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={`text-xs font-bold px-3 py-1.5 ${radius.full} border ${filter === 'all' ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong}`}`}>All ({rows.length})</button>
        {APPLICATION_STAGES.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`text-xs font-bold px-3 py-1.5 ${radius.full} border ${filter === k ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong}`}`}>{label} ({counts[k]})</button>
        ))}
      </div>

      {rows.length === 0 && <PixelEmpty sprite="ghost" title="No applicants yet">Share the gig link to get applications.</PixelEmpty>}

      <div className="space-y-3">
        {shown.map((r) => (
          <div key={r.id} className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-4 space-y-3`}>
            <div className="flex items-start gap-3">
              {r.profile?.avatar_url ? <img src={r.profile.avatar_url} alt="" className="w-11 h-11 object-cover shrink-0" /> : <PixelAvatar seed={r.user_id} size={44} />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${colors.textWhite}`}>
                  {r.profile?.display_name || 'Unnamed'}{' '}
                  {r.profile?.username && <Link to={`/u/${r.profile.username}`} className={`font-normal ${colors.accent}`}>@{r.profile.username}</Link>}
                </p>
                <p className={`text-[11px] ${colors.textFaint}`}>{r.profile?.university || 'No school listed'} · applied {new Date(r.created_at).toLocaleDateString()}</p>
                {r.profile?.bio && <p className={`text-xs ${colors.textMuted} mt-2 leading-relaxed`}>{r.profile.bio}</p>}
              </div>
            </div>

            {r.contact_method && (
              <p className={`flex items-center gap-2 text-xs ${colors.textWhite}`}>
                <Icon name="chat" size={14} className={colors.accent} />
                <span className={colors.textFaint}>{APPLICATION_CONTACT_METHODS.find((m) => m.id === r.contact_method)?.label ?? r.contact_method}:</span>
                <span className="font-semibold select-all">{r.contact_value}</span>
              </p>
            )}
            {r.message && (
              <p className={`text-xs ${colors.textMuted} leading-relaxed ${colors.bgInset} p-3 whitespace-pre-line`}>{r.message}</p>
            )}
            <AnswersView questions={gig.questions} answers={r.answers} />
            <div className="flex flex-wrap gap-2">
              {APPLICATION_STAGES.map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => r.status !== k && setStage(r, k)}
                  aria-pressed={r.status === k}
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 border ${
                    r.status === k ? `${k === 'rejected' ? 'bg-md3-error/20 text-md3-error border-md3-error/50' : `${colors.accentBg} ${colors.accentOn} border-transparent`}` : `${colors.textMuted} ${colors.borderStrong}`
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
