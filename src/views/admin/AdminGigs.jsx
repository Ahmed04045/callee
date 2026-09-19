// src/views/admin/AdminGigs.jsx

import React from 'react';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../components/TelemetryLog';
import ModerationQueue from '../../components/ModerationQueue';

export default function AdminGigs() {
  const { colors, radius } = themeConfig;

  const setStatus = async (gig, next) => {
    logUserAction('ADMIN_GIG_STATUS_CHANGE', { gigId: gig.id, from: gig.status, to: next });
    const { error } = await supabase.from('gigs').update({ status: next }).eq('id', gig.id);
    return error?.message ?? null;
  };

  return (
    <ModerationQueue
      title="Gig moderation"
      subtitle="New submissions stay invisible on the public Recruit feed until approved."
      table="gigs"
      onSetStatus={setStatus}
      renderItem={(gig) => (
        <>
          <h3 className={`text-sm font-bold ${colors.textWhite}`}>{gig.role}</h3>
          <p className={`text-xs ${colors.textFaint} mt-0.5`}>
            {gig.posted_by} · {gig.compensation}
            {gig.location ? ` · ${gig.location}` : ''}
            {gig.is_remote ? ' · Remote' : ''}
          </p>
          <p className={`text-xs ${colors.textMuted} mt-3 leading-relaxed`}>{gig.details}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {(gig.tags ?? []).map((tag) => (
              <span key={tag} className={`text-[10px] ${colors.textFaint} ${colors.bgPill} px-2.5 py-1 ${radius.full} border ${colors.border}`}>#{tag}</span>
            ))}
          </div>
        </>
      )}
    />
  );
}
