// src/views/ActivityView.jsx
//
// One place for "what needs my attention": things derived from your data
// (join requests waiting on you as a moderator, events coming up in the next
// 3 days, your submissions still under review) plus the full notification
// list (All / Unread) with mark-read and delete.

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useMyActivity } from '../hooks/useMyActivity';
import { supabase } from '../lib/supabaseClient';
import { metaFor, timeAgo } from '../lib/notificationMeta';
import { formatLongDate } from '../components/FeedCards';
import { PixelEmpty } from '../components/Pixel';
import Icon from '../components/Icon';
import usePageMeta from '../lib/usePageMeta';

const count = (query) => query.then(({ count: n }) => n ?? 0);

export default function ActivityView({ onOpenAuthModal }) {
  usePageMeta('Activity', 'Your requests, approvals, RSVPs and upcoming events in one place.');
  const { colors, radius } = themeConfig;
  const { user, status: authStatus } = useAuth();
  const navigate = useNavigate();
  const { items, status, unread, markRead, markAllRead, remove } = useNotifications();
  const { going } = useMyActivity(user?.id);
  const [tab, setTab] = useState('all');
  const [waiting, setWaiting] = useState({ requests: 0, submissions: 0 });

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      // RLS only returns requests for clubs I moderate (or all, for admins); exclude my own.
      count(supabase.from('club_join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').neq('user_id', user.id)),
      count(supabase.from('gigs').select('id', { count: 'exact', head: true }).eq('posted_by_user_id', user.id).eq('status', 'pending')),
      count(supabase.from('events').select('id', { count: 'exact', head: true }).eq('posted_by_user_id', user.id).eq('status', 'pending')),
      count(supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('owner_user_id', user.id).eq('status', 'pending')),
    ]).then(([requests, gigs, events, groups]) => {
      if (active) setWaiting({ requests, submissions: gigs + events + groups });
    });
    return () => {
      active = false;
    };
  }, [user]);

  const soon = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 3);
    const iso = limit.toLocaleDateString('en-CA');
    return going.filter((e) => e.event_date <= iso);
  }, [going]);

  if (authStatus === 'loading') return null;
  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <PixelEmpty sprite="ghost" title="Sign in to see your activity">Requests, approvals and RSVPs show up here.</PixelEmpty>
        <button onClick={() => onOpenAuthModal?.()} className={`${colors.accentBg} ${colors.accentOn} font-bold text-sm px-5 py-2.5 ${radius.full}`}>
          Sign in
        </button>
      </div>
    );
  }

  const attention = [
    waiting.requests > 0 && { icon: 'how_to_reg', tone: colors.accent, text: `${waiting.requests} join request${waiting.requests === 1 ? '' : 's'} waiting for you`, to: '/clubs/moderator' },
    ...soon.map((e) => ({ icon: 'event_available', tone: colors.warning, text: `${e.title} · ${formatLongDate(e.event_date, e.start_time)}`, to: `/events/${e.id}` })),
    waiting.submissions > 0 && { icon: 'hourglass_top', tone: colors.textMuted, text: `${waiting.submissions} of your submission${waiting.submissions === 1 ? ' is' : 's are'} waiting for review`, to: '/my-submissions' },
  ].filter(Boolean);

  const shown = tab === 'unread' ? items.filter((n) => !n.read_at) : items;

  const open = (n) => {
    markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div className={`border-b ${colors.border} pb-3`}>
        <h1 className={`text-xl font-bold ${colors.textWhite} flex items-center gap-2`}>
          <Icon name="history" size={22} className={colors.accent} /> Activity
        </h1>
        <p className={`text-xs ${colors.textFaint} mt-1`}>What needs your attention, and everything that has happened to your stuff.</p>
      </div>

      <section className="space-y-3">
        <h2 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider`}>Needs your attention</h2>
        {attention.length === 0 ? (
          <PixelEmpty sprite="box" title="You're all caught up">
            Nothing is waiting on you right now. <Link to="/explore" className={colors.accent}>Find something to join</Link>.
          </PixelEmpty>
        ) : (
          <div className="space-y-2">
            {attention.map((a) => (
              <Link key={a.text} to={a.to} className={`flex items-center gap-3 p-3 ${colors.bgCardSoft} border ${colors.border} ${radius.md} ${colors.borderHover} transition`}>
                <Icon name={a.icon} size={18} className={a.tone} />
                <span className={`text-sm ${colors.textWhite}`}>{a.text}</span>
                <Icon name="chevron_right" size={16} className={`ml-auto ${colors.textFaint}`} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {[
              ['all', 'All'],
              ['unread', `Unread${unread ? ` (${unread})` : ''}`],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`text-xs font-bold px-3 py-1.5 ${radius.full} border transition ${
                  tab === id ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong}`
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className={`text-xs font-semibold ${colors.accent}`}>
              Mark all read
            </button>
          )}
        </div>

        {status === 'error' && <p className={`text-xs ${colors.error}`}>Couldn&apos;t load notifications. Has 011_notifications.sql been run?</p>}
        {status === 'ready' && shown.length === 0 && (
          <PixelEmpty sprite="ghost" title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}>
            Join requests, approvals, RSVPs and applications will appear here.
          </PixelEmpty>
        )}

        <div className="space-y-2">
          {shown.map((n) => {
            const meta = metaFor(n.type);
            return (
              <div key={n.id} className={`flex items-stretch ${colors.bgCard} border ${colors.border} ${radius.md} ${n.read_at ? 'opacity-70' : ''}`}>
                <button onClick={() => open(n)} className={`flex-1 min-w-0 text-left flex gap-3 p-3 ${colors.bgHoverInset}`}>
                  <Icon name={meta.icon} size={20} className={`mt-0.5 shrink-0 ${colors[meta.tone] ?? colors.accent}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-bold ${colors.textWhite}`}>{n.title}</span>
                    {n.body && <span className={`block text-xs ${colors.textMuted}`}>{n.body}</span>}
                    <span className={`block text-[11px] ${colors.textFaint} mt-1`}>{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read_at && <span className="w-2 h-2 mt-2 bg-md3-primary shrink-0" aria-label="Unread" />}
                </button>
                <button onClick={() => remove(n.id)} aria-label="Delete notification" className={`px-3 ${colors.textFaint} ${colors.textHoverStrong}`}>
                  <Icon name="close" size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
