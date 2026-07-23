// src/views/MainFeedView.jsx

import React, { useState } from 'react';
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

export default function MainFeedView({ onNavigate }) {
  const { colors, radius, font, brand } = themeConfig;
  const [searchQuery, setSearchQuery] = useState('');

  const { data: events, status: eventsStatus } = useSupabaseTable('events', {
    orderBy: 'event_date',
  });
  const { data: featuredGigs, status: gigsStatus } = useSupabaseTable('gigs', {
    filters: { featured: true, status: 'approved' },
    orderBy: 'created_at',
    ascending: false,
  });

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
            className={`w-full ${colors.bgCard} border ${colors.border} ${radius.full} pl-12 pr-4 py-3 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
          />
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Trending events */}
        <div className="md:col-span-2 space-y-4">
          <h3
            className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}
          >
            <Icon name="local_fire_department" size={16} className={colors.warning} /> Trending Events
          </h3>

          {eventsStatus === 'loading' && (
            <p className={`text-xs ${colors.textFaint}`}>Loading events…</p>
          )}
          {eventsStatus === 'error' && (
            <p className={`text-xs ${colors.error}`}>Couldn't load events. Try refreshing.</p>
          )}
          {eventsStatus === 'ready' && events.length === 0 && (
            <p className={`text-xs ${colors.textFaint}`}>No events posted yet — check back soon.</p>
          )}

          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-5 ${colors.borderHover} transition`}
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
                  <span className={`text-[10px] ${colors.textFaint}`}>
                    {event.spots} spots left
                  </span>
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

        {/* Top recruitment */}
        <div className="space-y-4">
          <h3
            className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}
          >
            <Icon name="work" size={16} className={colors.secondary} /> Top Recruitment Calls
          </h3>

          {gigsStatus === 'loading' && <p className={`text-xs ${colors.textFaint}`}>Loading…</p>}
          {gigsStatus === 'ready' && featuredGigs.length === 0 && (
            <p className={`text-xs ${colors.textFaint}`}>No featured roles right now.</p>
          )}

          {featuredGigs.map((gig) => (
            <div
              key={gig.id}
              className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-4 space-y-3`}
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
              <button
                onClick={() => {
                  logUserAction('NAVIGATE_TAB', { from: 'main', to: 'recruit', via: gig.id });
                  onNavigate?.('recruit');
                }}
                className={`w-full text-center text-[11px] font-bold ${colors.accent} ${colors.bgCard} ${colors.bgHoverInset} py-2 ${radius.full} transition border ${colors.borderStrong}`}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}