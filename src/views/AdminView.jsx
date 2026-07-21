// src/views/AdminView.jsx
//
// This page is gated two ways:
//   1. Client-side (isAdmin from AuthContext) — purely UX, hides the tab
//      and shows a message instead of a blank/broken screen for non-admins.
//   2. Server-side (Row Level Security + is_admin() in Postgres) — the
//      actual security boundary. Even if someone forces activeTab to
//      'admin' via devtools, the gigs query below returns nothing for a
//      non-admin because the database itself refuses the rows.
// Never add a feature here that skips #2 and relies on #1 alone.

import React, { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, ShieldAlert } from 'lucide-react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from '../components/TelemetryLog';

const STATUS_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

export default function AdminView() {
  const { colors, radius } = themeConfig;
  const { isAdmin, isAdminLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState('pending');

  const {
    data: gigs,
    status: gigsStatus,
    refetch,
  } = useSupabaseTable('gigs', {
    filters: { status: statusFilter },
    orderBy: 'created_at',
    ascending: false,
    enabled: isAdmin === true,
  });

  const updateStatus = async (gig, nextStatus) => {
    logUserAction('ADMIN_GIG_STATUS_CHANGE', { gigId: gig.id, from: gig.status, to: nextStatus });
    const { error } = await supabase.from('gigs').update({ status: nextStatus }).eq('id', gig.id);
    if (!error) refetch();
  };

  if (isAdminLoading) {
    return <p className={`text-sm ${colors.textFaint}`}>Checking admin access…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldAlert size={28} className={`mx-auto mb-3 ${colors.textFaint}`} />
        <h2 className={`text-lg font-bold ${colors.textWhite}`}>Admin access required</h2>
        <p className={`text-xs ${colors.textFaint} mt-2 leading-relaxed`}>
          This account isn't in <code className={colors.accent}>app_admins</code>. That's
          enforced by the database, not this page — there's nothing to unlock here client-side.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>Gig Moderation</h2>
        <p className={`text-xs ${colors.textFaint} mt-1`}>
          New submissions land here as Pending and stay invisible on the public Recruit feed
          until approved.
        </p>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`text-xs font-bold px-3 py-1.5 ${radius.sm} border transition ${
              statusFilter === tab.id
                ? `${colors.accentBg} ${colors.accentOn} border-transparent`
                : `${colors.textFaint} ${colors.borderStrong} hover:text-white`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {gigsStatus === 'loading' && <p className={`text-xs ${colors.textFaint}`}>Loading…</p>}
      {gigsStatus === 'error' && (
        <p className="text-xs text-red-400">Couldn't load gigs. Try refreshing.</p>
      )}
      {gigsStatus === 'ready' && gigs.length === 0 && (
        <p className={`text-xs ${colors.textFaint}`}>Nothing in "{statusFilter}" right now.</p>
      )}

      <div className="space-y-4">
        {gigs.map((gig) => (
          <div
            key={gig.id}
            className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-5`}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className={`text-sm font-bold ${colors.textWhite}`}>{gig.role}</h3>
                <p className={`text-xs ${colors.textFaint} mt-0.5`}>
                  {gig.posted_by} · {gig.compensation}
                </p>
              </div>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded shrink-0 ${colors.bgPanel} border ${colors.borderStrong} ${colors.textFaint}`}
              >
                {gig.status}
              </span>
            </div>

            <p className={`text-xs ${colors.textMuted} mt-3 leading-relaxed`}>{gig.details}</p>

            <div className="flex gap-2 mt-4 flex-wrap">
              {(gig.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className={`text-[10px] font-mono ${colors.textFaint} ${colors.bgPill} px-2 py-1 rounded border ${colors.border}`}
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              {gig.status !== 'approved' && (
                <button
                  onClick={() => updateStatus(gig, 'approved')}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 ${radius.sm} ${colors.success} ${colors.bgPanel} border ${colors.borderStrong} hover:border-emerald-700 transition`}
                >
                  <CheckCircle size={12} /> Approve
                </button>
              )}
              {gig.status !== 'rejected' && (
                <button
                  onClick={() => updateStatus(gig, 'rejected')}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 ${radius.sm} text-red-400 ${colors.bgPanel} border ${colors.borderStrong} hover:border-red-800 transition`}
                >
                  <XCircle size={12} /> Reject
                </button>
              )}
              {gig.status !== 'pending' && (
                <button
                  onClick={() => updateStatus(gig, 'pending')}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 ${radius.sm} ${colors.textFaint} ${colors.bgPanel} border ${colors.borderStrong} hover:text-white transition`}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
