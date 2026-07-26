// src/views/GigDetailView.jsx

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';

export default function GigDetailView() {
  const { colors, radius } = themeConfig;
  const { id } = useParams();
  const { user } = useAuth();

  const [gig, setGig] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'notFound' | 'error'
  const [hasApplied, setHasApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setStatus('loading');
      const { data, error } = await supabase.from('gigs').select('*').eq('id', id).maybeSingle();
      if (!isMounted) return;

      if (error) {
        setStatus('error');
        return;
      }
      if (!data) {
        setStatus('notFound');
        return;
      }
      setGig(data);
      setStatus('ready');

      if (user) {
        const { data: existingApplication } = await supabase
          .from('applications')
          .select('id')
          .eq('gig_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (isMounted) setHasApplied(Boolean(existingApplication));
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [id, user]);

  const handleApply = async () => {
    if (!user) return;
    setIsApplying(true);
    logUserAction('APPLY_SUBMIT', { gigId: id, source: 'detail' });
    const { error } = await supabase.from('applications').insert({ gig_id: id, user_id: user.id });
    setIsApplying(false);
    if (!error) setHasApplied(true);
  };

  if (status === 'loading') {
    return <p className={`text-sm ${colors.textFaint}`}>Loading…</p>;
  }

  if (status === 'notFound' || status === 'error') {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <Icon name="search_off" size={28} className={colors.textFaint} />
        <p className={`text-sm ${colors.textFaint}`}>
          {status === 'notFound' ? "This listing doesn't exist (or isn't public)." : "Couldn't load this listing."}
        </p>
        <Link to="/recruit" className={`text-xs font-semibold ${colors.accent}`}>
          Back to Recruit
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Link
        to="/recruit"
        className={`inline-flex items-center gap-1 text-xs font-semibold ${colors.textFaint} ${colors.textHoverAccent} transition`}
      >
        <Icon name="arrow_back" size={14} /> Back to Recruit
      </Link>

      <div className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-6`}>
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-bold ${colors.textWhite}`}>{gig.role}</h1>
              {gig.verified && (
                <span className={`flex items-center gap-1 text-[10px] ${colors.success}`}>
                  <Icon name="verified" size={13} /> Verified
                </span>
              )}
            </div>
            <p className={`text-xs ${colors.textMuted} mt-1`}>Posted by {gig.posted_by}</p>
          </div>
          <span
            className={`text-xs ${colors.bgInset} border ${colors.borderStrong} ${colors.success} px-2.5 py-1 ${radius.full} shrink-0`}
          >
            {gig.compensation}
          </span>
        </div>

        <p className={`text-sm ${colors.textMuted} mt-4 leading-relaxed`}>{gig.details}</p>

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

        <div className={`mt-6 pt-4 border-t ${colors.border}`}>
          {!user ? (
            <p className={`text-xs ${colors.textFaint}`}>Sign in to apply.</p>
          ) : (
            <button
              onClick={handleApply}
              disabled={hasApplied || isApplying}
              className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider px-4 py-2 ${radius.full} transition ${
                hasApplied
                  ? `${colors.success} ${colors.bgInset} border ${colors.borderStrong} cursor-default`
                  : `${colors.accentBg} ${colors.accentOn} ${colors.accentBgHover}`
              }`}
            >
              {hasApplied ? (
                <>
                  Submitted <Icon name="check_circle" size={13} className="text-inherit" />
                </>
              ) : (
                <>
                  Submit Project Request <Icon name="arrow_forward" size={13} className="text-inherit" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}