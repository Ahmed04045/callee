// src/views/MainFeedView.jsx

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function matches(query, ...fields) {
  return fields.some((field) => field?.toLowerCase().includes(query));
}

export default function MainFeedView() {
  const { colors, radius, font, brand } = themeConfig;
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { data: events, status: eventsStatus } = useSupabaseTable('events', {
    orderBy: 'event_date',
  });
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

  const visibleEvents = useMemo(() => {
    if (!isSearching) return events;
    return events.filter((e) => matches(query, e.title, e.organizer, e.tag, e.location));
  }, [events, isSearching, query]);

  const visibleGigs = useMemo(() => {
    if (!isSearching) return allGigs.filter((g) => g.featured);
    return allGigs.filter(
      (g) => matches(query, g.role, g.posted_by, g.details) || (g.tags ?? []).some((t) => t.toLowerCase().includes(query))
    );
  }, [allGigs, isSearching, query]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    logUserAction('SEARCH_SUBMIT', { query: searchQuery.trim() });
  };

  return (
    <div className="space-y-10">
      {/* Hero + search */}
      <div className="text-center py-6 space-y-4">
        <h2 className={`text-2xl sm:text-4xl ${font.heading} ${colors.textWhite} tracking-tight`}>
          {brand.tagline}
          <br />
          <span className={colors.gradientText}>{brand.subTagline}</span>
        </h2>

        <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto relative mt-4">
          <Icon
            name="search"
            size={18}
            className={`absolute left-4 top-1/2 -translate-y-1/2 ${colors.textFaint}`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coding gigs, video editing, local events..."
            className={`w-full ${colors.bgCard} border ${colors.border} ${radius.full} pl-12 pr-10 py-3 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className={`absolute right-4 top-1/2 -translate-y-1/2 ${colors.textFaint} ${colors.textHoverStrong} transition`}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Events */}
        <div className="md:col-span-2 space-y-4">
          <h3
            className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}
          >
            <Icon
              name={isSearching ? 'search' : 'local_fire_department'}
              size={16}
              className={isSearching ? colors.textFaint : colors.warning}
            />
            {isSearching ? `Events matching "${searchQuery.trim()}"` : 'Trending Events'}
          </h3>

          {eventsStatus === 'loading' && (
            <p className={`text-xs ${colors.textFaint}`}>Loading events…</p>
          )}
          {eventsStatus === 'error' && (
            <p className={`text-xs ${colors.error}`}>Couldn't load events. Try refreshing.</p>
          )}
          {eventsStatus === 'ready' && visibleEvents.length === 0 && (
            <p className={`text-xs ${colors.textFaint}`}>
              {isSearching ? 'No matching events.' : 'No events posted yet — check back soon.'}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4">
            {visibleEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-5 ${colors.borderHover} transition cursor-pointer`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span
                      className={`text-[10px] ${colors.accentSoftBg} ${colors.accent} border ${colors.accentBorder} px-2.5 py-0.5 ${radius.full}`}
                    >
                      {event.tag}
                    </span>
                    <h4 className={`text-lg font-bold ${colors.textWhite} mt-2`}>{event.title}</h4>
                    <p className={`text-xs ${colors.textMuted} mt-0.5`}>By {event.organizer}</p>
                  </div>
                  <span className={`text-[10px] ${colors.textFaint}`}>{event.spots} spots left</span>
                </div>
                <div
                  className={`mt-4 flex justify-between items-center text-xs ${colors.textFaint} pt-3 border-t ${colors.border}`}
                >
                  <div>{formatDate(event.event_date)}</div>
                  <div className="flex items-center gap-1">
                    <Icon name="location_on" size={13} /> {event.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gigs & Opportunities */}
        <div className="space-y-4">
          <h3
            className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}
          >
            <Icon name="work" size={16} className={colors.secondary} />
            {isSearching ? 'Matching Gigs' : 'Top Recruitment Calls'}
          </h3>

          {gigsStatus === 'loading' && <p className={`text-xs ${colors.textFaint}`}>Loading…</p>}
          {gigsStatus === 'ready' && visibleGigs.length === 0 && (
            <p className={`text-xs ${colors.textFaint}`}>
              {isSearching ? 'No matching gigs.' : 'No featured roles right now.'}
            </p>
          )}

          {visibleGigs.map((gig) => (
            <div
              key={gig.id}
              onClick={() => navigate(`/gigs/${gig.id}`)}
              className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-4 space-y-3 cursor-pointer ${colors.borderHover} transition`}
            >
              <div>
                <span
                  className={`text-[9px] font-bold ${colors.secondarySoftBg} ${colors.secondary} px-2.5 py-0.5 ${radius.full}`}
                >
                  {gig.compensation}
                </span>
                <h4 className={`text-sm font-bold ${colors.textWhite} mt-1.5`}>{gig.role}</h4>
                <p className={`text-[11px] ${colors.textFaint}`}>{gig.posted_by}</p>
              </div>
              <p className={`text-xs ${colors.textMuted} line-clamp-2 leading-relaxed`}>
                {gig.details}
              </p>
              <span
                className={`block w-full text-center text-[11px] font-bold ${colors.accent} ${colors.bgCard} py-2 ${radius.full} border ${colors.borderStrong}`}
              >
                View Details
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}