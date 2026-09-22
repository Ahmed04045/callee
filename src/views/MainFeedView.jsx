// src/views/MainFeedView.jsx

import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import usePageMeta from '../lib/usePageMeta';
import themeConfig from '../theme/themeConfig';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';
import { PixelEmpty } from '../components/Pixel';
import { CardSkeleton, EventCard, GigCard, WeekTile } from '../components/FeedCards';
import MyHome from '../components/MyHome';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';

// Local calendar date (YYYY-MM-DD) — events dated today still count as upcoming.
function todayLocalISO() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function matches(query, ...fields) {
  return fields.some((field) => field?.toLowerCase().includes(query));
}

export default function MainFeedView() {
  const { t } = useT();
  const { colors, radius, font, brand } = themeConfig;
  const [params] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(params.get('q') ?? '');
  usePageMeta('Explore', 'Upcoming events, gigs and recruitment calls for students in Qatar.');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only approved events (admins and organizers can also *read* their pending
  // ones under RLS, which must not leak into the public feed) and only ones
  // that haven't happened yet.
  const { data: allEvents, status: eventsStatus } = useSupabaseTable('events', {
    filters: { status: 'approved' },
    orderBy: 'event_date',
  });
  const events = useMemo(() => allEvents.filter((e) => e.event_date >= todayLocalISO()), [allEvents]);
  // Fetches every approved gig, not just featured ones — search needs the
  // full set to search against; the normal (non-searching) Feed view just
  // filters this down to featured=true client-side, so it's one query
  // covering both cases instead of two separate ones.
  const { data: allGigs, status: gigsStatus } = useSupabaseTable('gigs', {
    filters: { status: 'approved' },
    orderBy: 'created_at',
    ascending: false,
  });

  const query = searchQuery.trim().toLowerCase();
  const isSearching = query.length > 0;

  // Type chips are built from the types that actually have upcoming events.
  const [typeFilter, setTypeFilter] = useState('');
  const eventTypes = useMemo(() => [...new Set(events.map((e) => e.event_type || e.tag).filter(Boolean))].sort(), [events]);

  const visibleEvents = useMemo(() => {
    const byType = typeFilter ? events.filter((e) => (e.event_type || e.tag) === typeFilter) : events;
    if (!isSearching) return byType;
    return byType.filter((e) => matches(query, e.title, e.organizer, e.tag, e.location));
  }, [events, isSearching, query, typeFilter]);

  const visibleGigs = useMemo(() => {
    const today = todayLocalISO();
    const open = allGigs.filter((g) => !g.deadline || g.deadline >= today);
    if (!isSearching) return open.filter((g) => g.featured);
    return open.filter(
      (g) => matches(query, g.role, g.posted_by, g.details) || (g.tags ?? []).some((t) => t.toLowerCase().includes(query))
    );
  }, [allGigs, isSearching, query]);

  // Events in the next 7 days (a quick "what's on" strip above the full list).
  const thisWeek = useMemo(() => {
    const start = todayLocalISO();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const pad = (n) => String(n).padStart(2, '0');
    const endISO = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
    return events.filter((e) => e.event_date >= start && e.event_date <= endISO);
  }, [events]);

  const openEvent = (event) => navigate(`/events/${event.id}`);
  const openGig = (gig) => navigate(`/gigs/${gig.id}`);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Length only — never log what teens type into search (see TelemetryLog note).
    logUserAction('SEARCH_SUBMIT', { queryLength: searchQuery.trim().length });
  };

  return (
    <div className="space-y-10">
      {/* Personal Home (signed in): your events, clubs, history, applications */}
      {user && <MyHome />}

      {/* Hero + search. Signed in, the hero shrinks to a "Discover" heading. */}
      <div className={`text-center space-y-4 ${user ? 'pt-2' : 'py-6'}`}>
        {user ? (
          <h2 className={`text-lg ${font.heading} ${colors.textWhite} text-start border-t ${colors.border} pt-8`}>{t('Discover something new')}</h2>
        ) : (
          <h2 className={`text-2xl sm:text-4xl ${font.heading} ${colors.textWhite} tracking-tight`}>
            {t(brand.tagline)}
            <br />
            <span className={colors.secondary}>{t(brand.subTagline)}</span>
          </h2>
        )}

        <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto relative mt-4">
          <Icon
            name="search"
            size={18}
            className={`absolute start-4 top-1/2 -translate-y-1/2 ${colors.textFaint}`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Search coding gigs, video editing, local events...')}
            className={`w-full ${colors.bgCard} border ${colors.border} ${radius.full} ps-12 pe-10 py-3 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={t('Clear search')}
              className={`absolute end-4 top-1/2 -translate-y-1/2 ${colors.textFaint} ${colors.textHoverStrong} transition`}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </form>
      </div>

      {!isSearching && thisWeek.length > 0 && (
        <section className="space-y-3">
          <h3 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}>
            <Icon name="bolt" size={16} className={colors.warning} /> {t('Happening this week')}
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
            {thisWeek.map((event) => (
              <WeekTile key={event.id} event={event} onOpen={openEvent} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Events */}
        <div className="md:col-span-2 space-y-4">
          <h3 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}>
            <Icon name={isSearching ? 'search' : 'local_fire_department'} size={16} className={isSearching ? colors.textFaint : colors.warning} />
            {isSearching ? `Events matching "${searchQuery.trim()}"` : t('Upcoming Events')}
          </h3>

          {eventTypes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['', ...eventTypes].map((type) => (
                <button
                  key={type || 'all'}
                  onClick={() => setTypeFilter(type)}
                  aria-pressed={typeFilter === type}
                  className={`text-xs font-bold whitespace-nowrap px-3 py-1.5 ${radius.full} border ${typeFilter === type ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong}`}`}
                >
                  {type ? t(type) : t('All')}
                </button>
              ))}
            </div>
          )}

          {eventsStatus === 'loading' && (
            <div className="grid gap-4">
              <CardSkeleton tall />
              <CardSkeleton tall />
            </div>
          )}
          {eventsStatus === 'error' && <p className={`text-xs ${colors.error}`}>{t('Couldn\'t load events. Try refreshing.')}</p>}
          {eventsStatus === 'ready' && visibleEvents.length === 0 && (
            <PixelEmpty sprite={isSearching ? 'search' : 'ghost'} title={isSearching ? t('No matching events') : t('No upcoming events yet')}>
              {isSearching ? t('Try a different search.') : t('Be the first to create one from the Create tab.')}
            </PixelEmpty>
          )}

          <div className="grid grid-cols-1 gap-5">
            {visibleEvents.map((event) => (
              <EventCard key={event.id} event={event} onOpen={openEvent} />
            ))}
          </div>
        </div>

        {/* Gigs & Opportunities */}
        <div className="space-y-4">
          <h3 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}>
            <Icon name="work" size={16} className={colors.secondary} />
            {isSearching ? t('Matching Gigs') : t('Featured Recruitment Calls')}
          </h3>

          {gigsStatus === 'loading' && <CardSkeleton />}
          {gigsStatus === 'ready' && visibleGigs.length === 0 && (
            <PixelEmpty sprite="box" title={isSearching ? t('No matching gigs') : t('No featured roles right now')} />
          )}

          {visibleGigs.map((gig) => (
            <GigCard key={gig.id} gig={gig} onOpen={openGig} />
          ))}
        </div>
      </div>
    </div>
  );
}
