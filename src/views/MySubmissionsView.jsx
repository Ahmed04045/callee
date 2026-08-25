// src/views/MySubmissionsView.jsx
//
// RLS already lets a poster read their own gigs/events regardless of
// status (002/006 migrations) — this is just the first UI that actually
// surfaces that as a real list instead of only being reachable by
// visiting a specific item's own detail page if you remembered the link.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';

const STATUS_META = {
  pending: { label: 'Pending', color: 'warning', icon: 'hourglass_top' },
  approved: { label: 'Approved', color: 'success', icon: 'check_circle' },
  rejected: { label: 'Rejected', color: 'error', icon: 'cancel' },
};

function SubmissionRow({ item, kind, colors, radius, onClick }) {
  const meta = STATUS_META[item.status] ?? STATUS_META.pending;
  const title = kind === 'gig' ? item.role : item.title;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 p-4 text-left ${colors.bgHoverInset} transition`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon name={kind === 'gig' ? 'work' : 'event'} size={14} className={colors.textFaint} />
          <p className={`text-sm font-bold ${colors.textWhite} truncate`}>{title}</p>
        </div>
        <p className={`text-[11px] ${colors.textFaint} mt-0.5`}>
          {kind === 'gig' ? 'Gig / Opportunity' : 'Event'}
        </p>
      </div>
      <span
        className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide shrink-0 ${colors[meta.color]}`}
      >
        <Icon name={meta.icon} size={13} className="text-inherit" /> {meta.label}
      </span>
    </button>
  );
}

export default function MySubmissionsView() {
  const { colors, radius } = themeConfig;
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: myGigs, status: gigsStatus } = useSupabaseTable('gigs', {
    filters: user ? { posted_by_user_id: user.id } : undefined,
    orderBy: 'created_at',
    ascending: false,
    enabled: Boolean(user),
  });
  const { data: myEvents, status: eventsStatus } = useSupabaseTable('events', {
    filters: user ? { posted_by_user_id: user.id } : undefined,
    orderBy: 'created_at',
    ascending: false,
    enabled: Boolean(user),
  });

  const isLoading = gigsStatus === 'loading' || eventsStatus === 'loading';
  const isEmpty =
    gigsStatus === 'ready' && eventsStatus === 'ready' && myGigs.length === 0 && myEvents.length === 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <SubPageHeader title="My Submissions" />

      {isLoading && <p className={`text-sm ${colors.textFaint}`}>Loading…</p>}

      {isEmpty && (
        <div className="text-center py-12 space-y-3">
          <Icon name="inbox" size={28} className={colors.textFaint} />
          <p className={`text-sm ${colors.textFaint}`}>
            Nothing here yet — anything you post from Create shows up here with its review status.
          </p>
        </div>
      )}

      {!isLoading && (myGigs.length > 0 || myEvents.length > 0) && (
        <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} overflow-hidden divide-y ${colors.border}`}>
          {myGigs.map((gig) => (
            <SubmissionRow
              key={`gig-${gig.id}`}
              item={gig}
              kind="gig"
              colors={colors}
              radius={radius}
              onClick={() => navigate(`/gigs/${gig.id}`)}
            />
          ))}
          {myEvents.map((event) => (
            <SubmissionRow
              key={`event-${event.id}`}
              item={event}
              kind="event"
              colors={colors}
              radius={radius}
              onClick={() => navigate(`/events/${event.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}