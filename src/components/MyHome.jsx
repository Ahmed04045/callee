// src/components/MyHome.jsx
//
// The personal half of Home (shown when signed in): a greeting with quick
// stats, then what you're going to, your clubs, what you've been to and your
// applications. Discovery (this week / upcoming / featured) stays below it.

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useMyActivity } from '../hooks/useMyActivity';
import Icon from './Icon';
import ClubCard from './ClubCard';
import { CardSkeleton, DateBadge, EventCard, formatLongDate } from './FeedCards';
import { PixelEmpty } from './Pixel';

function SectionTitle({ icon, children, to, toLabel }) {
  const { colors } = themeConfig;
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}>
        <Icon name={icon} size={16} className={colors.accent} /> {children}
      </h3>
      {to && (
        <Link to={to} className={`text-[11px] font-mono font-bold uppercase tracking-wider ${colors.accent}`}>
          {toLabel} →
        </Link>
      )}
    </div>
  );
}

function StatTile({ icon, value, label, to }) {
  const { colors, radius } = themeConfig;
  return (
    <Link to={to} className={`${colors.bgCard} border ${colors.border} ${radius.lg} ${colors.borderHover} p-3 transition`}>
      <Icon name={icon} size={18} className={colors.accent} />
      <p className={`text-2xl font-display font-bold ${colors.textWhite} mt-2 leading-none`}>{value}</p>
      <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${colors.textFaint} mt-1`}>{label}</p>
    </Link>
  );
}

const APPLICATION_LABEL = { submitted: 'Applied', reviewing: 'In review', shortlisted: 'Shortlisted', accepted: 'Accepted', rejected: 'Not selected' };
const SAVED_ICON = { event: 'calendar_today', gig: 'work', club: 'groups' };
const savedLink = (s) => (s.kind === 'event' ? `/events/${s.item.id}` : s.kind === 'gig' ? `/gigs/${s.item.id}` : `/clubs/${s.item.id}`);
const savedTitle = (s) => (s.kind === 'event' ? s.item.title : s.kind === 'gig' ? s.item.role : s.item.name);

export default function MyHome() {
  const { colors, radius } = themeConfig;
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { going, attended, clubs, applications, saved, pendingRequests, status } = useMyActivity(user?.id);

  if (!user) return null;
  const name = profile?.display_name?.split(' ')[0] || (profile?.username ? `@${profile.username}` : 'there');
  const loading = status === 'loading';
  const row = `w-full text-left flex items-center gap-3 p-3 ${colors.bgCardSoft} border ${colors.border} ${radius.md} ${colors.borderHover} transition`;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <p className={`text-[11px] font-mono font-bold uppercase tracking-wider ${colors.accent}`}>Your home</p>
          <h2 className={`text-2xl sm:text-3xl font-display font-bold ${colors.textWhite}`}>Welcome back, {name}.</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon="event_available" value={loading ? '–' : going.length} label="Tickets" to="/tickets" />
          <StatTile icon="history" value={loading ? '–' : attended.length} label="Attended" to="/tickets" />
          <StatTile icon="groups" value={loading ? '–' : clubs.length} label="Clubs" to="/clubs" />
          <StatTile icon="work" value={loading ? '–' : applications.length} label="Applied" to="/recruit" />
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle icon="event_available" to="/tickets" toLabel="My tickets">You&apos;re going</SectionTitle>
        {loading && <CardSkeleton tall />}
        {!loading && going.length === 0 && (
          <PixelEmpty sprite="ghost" title="Nothing planned yet">
            Join an event and it will show up here.
          </PixelEmpty>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          {going.map((event) => (
            <EventCard key={event.id} event={event} onOpen={(e) => navigate(`/events/${e.id}`)} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle icon="groups" to="/clubs" toLabel="Browse clubs">Your clubs</SectionTitle>
        {pendingRequests > 0 && (
          <p className={`text-xs ${colors.textMuted} flex items-center gap-2`}>
            <Icon name="hourglass_top" size={14} className={colors.warning} /> {pendingRequests} join request{pendingRequests === 1 ? '' : 's'} waiting for a moderator.
          </p>
        )}
        {loading && <CardSkeleton tall />}
        {!loading && clubs.length === 0 && (
          <PixelEmpty sprite="box" title="You haven't joined a club yet">
            Clubs are private — request to join and a moderator lets you in.
          </PixelEmpty>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club) => (
            <ClubCard key={club.id} club={club} joined />
          ))}
        </div>
      </section>

      {attended.length > 0 && (
        <section className="space-y-4">
          <SectionTitle icon="history">You&apos;ve been to</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {attended.map((event) => (
              <button key={event.id} onClick={() => navigate(`/events/${event.id}`)} className={row}>
                <DateBadge date={event.event_date} />
                <span className="min-w-0">
                  <span className={`block text-sm font-bold ${colors.textWhite} truncate`}>{event.title}</span>
                  <span className={`block text-[11px] ${colors.textFaint} truncate`}>
                    {formatLongDate(event.event_date)} · {event.location}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {saved.length > 0 && (
        <section className="space-y-4">
          <SectionTitle icon="star">Saved</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {saved.map((s) => (
              <button key={`${s.kind}-${s.item.id}`} onClick={() => navigate(savedLink(s))} className={row}>
                <Icon name={SAVED_ICON[s.kind]} size={20} className={colors.accent} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold ${colors.textWhite} truncate`}>{savedTitle(s)}</span>
                  <span className={`block text-[11px] ${colors.textFaint} capitalize`}>{s.kind}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {applications.length > 0 && (
        <section className="space-y-4">
          <SectionTitle icon="work" to="/recruit" toLabel="Find more">Your applications</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {applications.map(({ gig, status: appStatus }) => (
              <button key={gig.id} onClick={() => navigate(`/gigs/${gig.id}`)} className={row}>
                <Icon name="work" size={20} className={colors.secondary} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold ${colors.textWhite} truncate`}>{gig.role}</span>
                  <span className={`block text-[11px] ${colors.textFaint} truncate`}>{gig.posted_by}</span>
                </span>
                <span className={`shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 ${colors.bgPill} ${colors.textMuted}`}>
                  {APPLICATION_LABEL[appStatus] ?? appStatus}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
