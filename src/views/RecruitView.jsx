// src/views/RecruitView.jsx

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';
import { PixelEmpty } from '../components/Pixel';
import { GIG_TAGS } from '../lib/options';
import usePageMeta from '../lib/usePageMeta';

export default function RecruitView({ onOpenAuthModal }) {
  const { colors, radius } = themeConfig;
  const { user } = useAuth();
  const navigate = useNavigate();

  usePageMeta('Gigs & opportunities', 'Recruitment calls and collaborations for students and young creators in Qatar.');
  const { data: allGigs, status: gigsStatus } = useSupabaseTable('gigs', {
    filters: { status: 'approved' },
    orderBy: 'created_at',
    ascending: false,
  });

  const {
    data: applications,
    status: applicationsStatus,
  } = useSupabaseTable('applications', {
    filters: user ? { user_id: user.id } : undefined,
    enabled: Boolean(user),
  });

  // Filters (all client-side over the approved list). Expired gigs are hidden.
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all'); // all | gig | opportunity
  const [paidOnly, setPaidOnly] = useState(false);
  const [closingSoon, setClosingSoon] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [tag, setTag] = useState('');

  const gigs = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const soonISO = soon.toLocaleDateString('en-CA');
    const q = query.trim().toLowerCase();
    return allGigs.filter((g) => {
      if (g.deadline && g.deadline < today) return false;
      if (kind !== 'all' && g.kind !== kind) return false;
      if (paidOnly && !/^paid/i.test(g.compensation ?? '')) return false;
      if (closingSoon && !(g.deadline && g.deadline <= soonISO)) return false;
      if (remoteOnly && !g.is_remote) return false;
      if (tag && !(g.tags ?? []).includes(tag)) return false;
      if (q && ![g.role, g.posted_by, g.details, g.location, ...(g.tags ?? [])].some((f) => f?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allGigs, query, kind, paidOnly, closingSoon, remoteOnly, tag]);
  const hasFilters = Boolean(query || kind !== 'all' || paidOnly || closingSoon || remoteOnly || tag);
  const clearFilters = () => {
    setQuery('');
    setKind('all');
    setPaidOnly(false);
    setClosingSoon(false);
    setRemoteOnly(false);
    setTag('');
  };

  const appliedGigIds = useMemo(
    () => new Set(applications.map((application) => application.gig_id)),
    [applications]
  );

  // Applying happens on the gig's page so its questions can be asked.
  const handleApply = (e, gig) => {
    e.stopPropagation(); // don't also trigger the card's click-through
    if (!user) {
      logUserAction('APPLY_BLOCKED_UNAUTHENTICATED', { gigId: gig.id });
      onOpenAuthModal?.();
      return;
    }
    navigate(`/gigs/${gig.id}?apply=1`);
  };

  return (
    <div className="space-y-6 w-full">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>Active Recruitment Pipeline</h2>
        <p className={`text-xs ${colors.textFaint} mt-1`}>
          Direct development, media production, and project design roles for young creators.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Icon name="search" size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${colors.textFaint}`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles, teams, skills…"
            className={`w-full ${colors.bgInset} border ${colors.border} ${radius.md} pl-10 pr-3 py-2.5 text-sm ${colors.textWhite} outline-none focus:border-md3-primary`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[['all', 'All'], ['gig', 'Gigs'], ['opportunity', 'Opportunities']].map(([k, label]) => (
            <button key={k} onClick={() => setKind(k)} className={`text-xs font-bold px-3 py-1.5 ${radius.full} border ${kind === k ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong}`}`}>{label}</button>
          ))}
          <span className="w-px bg-md3-outlineVariant mx-1" aria-hidden="true" />
          {[['Paid only', paidOnly, setPaidOnly], ['Closing soon', closingSoon, setClosingSoon], ['Remote', remoteOnly, setRemoteOnly]].map(([label, on, set]) => (
            <button key={label} onClick={() => set(!on)} aria-pressed={on} className={`text-xs font-bold px-3 py-1.5 ${radius.full} border ${on ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong}`}`}>{label}</button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {GIG_TAGS.map((t) => (
            <button key={t} onClick={() => setTag(tag === t ? '' : t)} aria-pressed={tag === t} className={`text-[11px] font-semibold whitespace-nowrap px-3 py-1 ${radius.full} border ${tag === t ? `${colors.accentSoftBg} ${colors.accent} border-md3-primary` : `${colors.textFaint} ${colors.border}`}`}>#{t}</button>
          ))}
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className={`text-xs font-semibold ${colors.accent}`}>Clear filters ({gigs.length} shown)</button>
        )}
      </div>

      {gigsStatus === 'loading' && <p className={`text-xs ${colors.textFaint}`}>Loading roles…</p>}
      {gigsStatus === 'error' && (
        <p className={`text-xs ${colors.error}`}>Couldn't load roles. Try refreshing.</p>
      )}
      {gigsStatus === 'ready' && gigs.length === 0 && (
        <PixelEmpty sprite="search" title="No active roles right now">Check back soon, or post one from the Create tab.</PixelEmpty>
      )}

      {gigs.map((gig) => {
        const isSubmitted = appliedGigIds.has(gig.id);
        const isCheckingApplied = Boolean(user) && applicationsStatus === 'loading';

        return (
          <div
            key={gig.id}
            onClick={() => navigate(`/gigs/${gig.id}`)}
            className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-6 ${colors.borderHover} transition cursor-pointer`}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-bold ${colors.textWhite}`}>{gig.role}</h3>
                  {gig.verified && (
                    <span
                      title="Organizer identity verified"
                      className={`flex items-center gap-1 text-[10px] ${colors.success}`}
                    >
                      <Icon name="verified" size={13} /> Verified
                    </span>
                  )}
                </div>
                <p className={`text-xs ${colors.textMuted}`}>Posted by: {gig.posted_by}</p>
              </div>
              <span
                className={`text-xs ${colors.bgInset} border ${colors.borderStrong} ${colors.success} px-2.5 py-1 ${radius.full}`}
              >
                {gig.compensation}
              </span>
            </div>

            <p className={`text-sm ${colors.textMuted} mt-3 leading-relaxed`}>{gig.details}</p>

            <div className="flex gap-2 mt-4 flex-wrap">
              {(gig.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className={`text-[10px] ${colors.textFaint} ${colors.bgPill} px-2.5 py-1 ${radius.full} border ${colors.border}`}
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className={`mt-5 pt-4 border-t ${colors.border} flex justify-between items-center`}>
              {!user && (
                <span className={`text-[11px] ${colors.textFaint}`}>Sign in to apply</span>
              )}
              <div className="ml-auto">
                <button
                  onClick={(e) => handleApply(e, gig)}
                  disabled={isSubmitted || isCheckingApplied}
                  className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider px-4 py-2 ${radius.full} transition
                    ${
                      isSubmitted
                        ? `${colors.success} ${colors.bgInset} border ${colors.borderStrong} cursor-default`
                        : `${colors.accentBg} ${colors.accentOn} ${colors.accentBgHover}`
                    }`}
                >
                  {isSubmitted ? (
                    <>
                      Submitted <Icon name="check_circle" size={13} className="text-inherit" />
                    </>
                  ) : user ? (
                    <>
                      Submit Project Request <Icon name="arrow_forward" size={13} className="text-inherit" />
                    </>
                  ) : (
                    <>
                      Sign In to Apply <Icon name="login" size={13} className="text-inherit" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}