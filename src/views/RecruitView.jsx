// src/views/RecruitView.jsx

import React, { useState } from 'react';
import { ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import themeConfig from '../theme/themeConfig';
import { logUserAction } from '../components/TelemetryLog';

export default function RecruitView({ gigs = [] }) {
  const { colors, radius } = themeConfig;
  const [submittedIds, setSubmittedIds] = useState([]);

  const handleApply = (gig) => {
    logUserAction('APPLY_SUBMIT', { gigId: gig.id, role: gig.role, postedBy: gig.postedBy });
    setSubmittedIds((prev) => (prev.includes(gig.id) ? prev : [...prev, gig.id]));
  };

  return (
    <div className="space-y-6 w-full">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>Active Recruitment Pipeline</h2>
        <p className={`text-xs ${colors.textFaint} mt-1`}>
          Direct development, media production, and project design roles for young creators.
        </p>
      </div>

      {gigs.map((gig) => {
        const isSubmitted = submittedIds.includes(gig.id);
        return (
          <div
            key={gig.id}
            className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-6 ${colors.borderHover} transition`}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-bold ${colors.textWhite} hover:${colors.accent} cursor-pointer transition`}>
                    {gig.role}
                  </h3>
                  {gig.verified && (
                    <span
                      title="Organizer identity verified"
                      className={`flex items-center gap-1 text-[10px] font-mono ${colors.success}`}
                    >
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
                </div>
                <p className={`text-xs ${colors.textMuted}`}>Posted by: {gig.postedBy}</p>
              </div>
              <span
                className={`text-xs font-mono ${colors.bgPanel} border ${colors.borderStrong} ${colors.success} px-2 py-1 rounded`}
              >
                {gig.compensation}
              </span>
            </div>

            <p className={`text-sm ${colors.textMuted} mt-3 leading-relaxed`}>{gig.details}</p>

            <div className="flex gap-2 mt-4">
              {gig.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-[10px] font-mono ${colors.textFaint} ${colors.bgPill} px-2 py-1 rounded border ${colors.border}`}
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className={`mt-5 pt-4 border-t ${colors.border} flex justify-end`}>
              <button
                onClick={() => handleApply(gig)}
                disabled={isSubmitted}
                className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider px-4 py-2 ${radius.sm} transition
                  ${isSubmitted
                    ? `${colors.success} ${colors.bgPanel} border ${colors.borderStrong} cursor-default`
                    : `${colors.accentBg} ${colors.accentOn} ${colors.accentBgHover}`}`}
              >
                {isSubmitted ? (
                  <>
                    Submitted <CheckCircle size={12} />
                  </>
                ) : (
                  <>
                    Submit Project Request <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
