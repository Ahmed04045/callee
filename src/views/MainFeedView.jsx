// src/views/MainFeedView.jsx

import React, { useState } from 'react';
import { Search, Flame, Briefcase, MapPin, ArrowRight } from 'lucide-react';
import themeConfig from '../theme/themeConfig';
import { logUserAction } from '../components/TelemetryLog';

export default function MainFeedView({ events = [], gigs = [], onNavigate }) {
  const { colors, radius, font, brand } = themeConfig;
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    logUserAction('SEARCH_SUBMIT', { query: searchQuery.trim() });
  };

  const featuredGigs = gigs.filter((gig) => gig.featured);

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
          <Search className={`absolute left-4 top-3.5 ${colors.textFaint}`} size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coding gigs, video editing, local events..."
            className={`w-full ${colors.bgPanel} border ${colors.border} ${radius.md} pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 ${colors.transition}`}
          />
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Trending events */}
        <div className="md:col-span-2 space-y-4">
          <h3
            className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}
          >
            <Flame size={14} className={colors.warning} /> Trending Events
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className={`${colors.bgCard} border ${colors.border} ${radius.md} p-5 ${colors.borderHover} transition`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span
                      className={`text-[10px] font-mono ${colors.accentSoftBg} ${colors.accent} border ${colors.accentBorder} px-2 py-0.5 rounded`}
                    >
                      {event.tag}
                    </span>
                    <h4 className={`text-lg font-bold ${colors.textWhite} mt-2`}>{event.title}</h4>
                    <p className={`text-xs ${colors.textMuted} mt-0.5`}>By {event.organizer}</p>
                  </div>
                  <span className={`text-[10px] font-mono ${colors.textFaint}`}>
                    {event.spots} spots left
                  </span>
                </div>
                <div
                  className={`mt-4 flex justify-between items-center text-xs ${colors.textFaint} font-mono pt-3 border-t ${colors.border}`}
                >
                  <div>{event.date}</div>
                  <div className="flex items-center gap-1">
                    <MapPin size={12} /> {event.location}
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
            <Briefcase size={14} className={colors.secondary} /> Top Recruitment Calls
          </h3>
          {featuredGigs.map((gig) => (
            <div
              key={gig.id}
              className={`${colors.bgCardSoft} border ${colors.border} ${radius.md} p-4 space-y-3`}
            >
              <div>
                <span
                  className={`text-[9px] font-mono font-bold ${colors.secondarySoftBg} ${colors.secondary} px-2 py-0.5 ${radius.full}`}
                >
                  {gig.compensation}
                </span>
                <h4 className={`text-sm font-bold ${colors.textWhite} mt-1.5`}>{gig.role}</h4>
                <p className={`text-[11px] ${colors.textFaint}`}>{gig.postedBy}</p>
              </div>
              <p className={`text-xs ${colors.textMuted} line-clamp-2 leading-relaxed`}>
                {gig.details}
              </p>
              <button
                onClick={() => {
                  logUserAction('NAVIGATE_TAB', { from: 'main', to: 'recruit', via: gig.id });
                  onNavigate?.('recruit');
                }}
                className={`w-full text-center text-[11px] font-bold ${colors.accent} ${colors.bgPanel} hover:bg-neutral-800 py-2 ${radius.sm} transition border ${colors.borderStrong}`}
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
