// src/views/RecruitView.jsx

import React, { useMemo } from 'react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';

export default function RecruitView({ onOpenAuthModal }) {
  const { colors, radius } = themeConfig;
  const { user } = useAuth();

  const { data: gigs, status: gigsStatus } = useSupabaseTable('gigs', {
    filters: { status: 'approved' },
    orderBy: 'created_at',
    ascending: false,
  });

  const {
    data: applications,
    status: applicationsStatus,
    refetch: refetchApplications,
  } = useSupabaseTable('applications', {
    filters: user ? { user_id: user.id } : undefined,
    enabled: Boolean(user),
  });

  const appliedGigIds = useMemo(
    () => new Set(applications.map((application) => application.gig_id)),
    [applications]
  );

  const handleApply = async (gig) => {
    if (!user) {
      logUserAction('APPLY_BLOCKED_UNAUTHENTICATED', { gigId: gig.id });
      onOpenAuthModal?.();
      return;
    }

    logUserAction('APPLY_SUBMIT', { gigId: gig.id, role: gig.role, postedBy: gig.posted_by });

    const { error } = await supabase
      .from('applications')
      .insert({ gig_id: gig.id, user_id: user.id });

    if (!error) {
      refetchApplications();
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>Active Recruitment Pipeline</h2>
        <p className={`text-xs ${colors.textFaint} mt-1`}>
          Direct development, media production, and project design roles for young creators.
        </p>
      </div>

      {gigsStatus === 'loading' && <p className={`text-xs ${colors.textFaint}`}>Loading roles…</p>}
      {gigsStatus === 'error' && (
        <p className={`text-xs ${colors.error}`}>Couldn't load roles. Try refreshing.</p>
      )}
      {gigsStatus === 'ready' && gigs.length === 0 && (
        <p className={`text-xs ${colors.textFaint}`}>No active roles right now — check back soon.</p>
      )}

      {gigs.map((gig) => {
        const isSubmitted = appliedGigIds.has(gig.id);
        const isCheckingApplied = Boolean(user) && applicationsStatus === 'loading';

        return (
          <div
            key={gig.id}
            className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-6 ${colors.borderHover} transition`}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className={`text-lg font-bold ${colors.textWhite} ${colors.textHoverAccent} cursor-pointer transition`}
                  >
                    {gig.role}
                  </h3>
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
                  onClick={() => handleApply(gig)}
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