// src/components/FeedCards.jsx
//
// Cards used by the home feed: EventCard (pixel cover + date badge), GigCard,
// a compact "this week" tile, and pixel skeleton loaders. Covers are
// generated from the event id until real photos exist.

import React from 'react';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';
import { PixelCover } from './Pixel';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parts(dateString) {
  const [y, m, d] = String(dateString ?? '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return { day: d, month: MONTHS[m - 1], year: y };
}

export function formatLongDate(dateString, time) {
  const p = parts(dateString);
  if (!p) return dateString ?? '';
  const date = new Date(p.year, (MONTHS.indexOf(p.month)), p.day);
  const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return time ? `${label} · ${String(time).slice(0, 5)}` : label;
}

/** Small calendar-style date block. */
export function DateBadge({ date }) {
  const { colors } = themeConfig;
  const p = parts(date);
  if (!p) return null;
  return (
    <div className={`w-12 text-center border-2 border-md3-onSurface/80 bg-md3-surface/90 ${colors.textWhite}`} aria-label={`${p.month} ${p.day}`}>
      <div className="bg-md3-primary text-md3-onPrimary text-[10px] font-mono font-bold leading-4 tracking-wider">{p.month}</div>
      <div className="text-lg font-display font-bold leading-6">{p.day}</div>
    </div>
  );
}

export function EventCard({ event, onOpen }) {
  const { colors, radius } = themeConfig;
  return (
    <button
      onClick={() => onOpen(event)}
      className={`text-left w-full overflow-hidden ${colors.bgCard} border ${colors.border} ${radius.lg} ${colors.borderHover} transition`}
    >
      <div className="relative h-24">
        <PixelCover seed={event.id} cols={64} rows={12} />
        <div className="absolute left-3 bottom-[-18px]">
          <DateBadge date={event.event_date} />
        </div>
        {event.tag && (
          <span className={`absolute right-3 top-3 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 bg-md3-surface/85 ${colors.accent} border ${colors.accentBorder}`}>
            {event.tag}
          </span>
        )}
      </div>
      <div className="p-4 pt-6">
        <h4 className={`text-base font-bold leading-snug ${colors.textWhite}`}>{event.title}</h4>
        <p className={`text-xs ${colors.textMuted} mt-0.5`}>By {event.organizer}</p>
        <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] ${colors.textFaint}`}>
          <span className="flex items-center gap-1">
            <Icon name="calendar_today" size={13} /> {formatLongDate(event.event_date, event.start_time)}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 min-w-0">
              <Icon name="location_on" size={13} /> <span className="truncate">{event.location}</span>
            </span>
          )}
          {!event.capacity_hidden && event.spots != null && (
            <span className={`flex items-center gap-1 ${event.spots <= 5 ? colors.warning : ''}`}>
              <Icon name="group" size={13} /> {event.spots} spots left
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/** Compact tile for the horizontal "This week" strip. */
export function WeekTile({ event, onOpen }) {
  const { colors, radius } = themeConfig;
  return (
    <button
      onClick={() => onOpen(event)}
      className={`shrink-0 w-56 text-left overflow-hidden ${colors.bgCard} border ${colors.border} ${radius.lg} ${colors.borderHover} transition`}
    >
      <div className="relative h-14">
        <PixelCover seed={event.id} cols={48} rows={8} />
        <div className="absolute left-2 bottom-[-14px] scale-90 origin-bottom-left">
          <DateBadge date={event.event_date} />
        </div>
      </div>
      <div className="p-3 pt-5">
        <p className={`text-sm font-bold leading-snug line-clamp-2 ${colors.textWhite}`}>{event.title}</p>
        <p className={`text-[11px] ${colors.textFaint} mt-1 truncate`}>{event.location}</p>
      </div>
    </button>
  );
}

const gigDaysLeft = (deadline) => Math.max(0, Math.round((new Date(deadline) - new Date(new Date().toLocaleDateString('en-CA'))) / 86400000));

export function GigCard({ gig, onOpen }) {
  const { colors, radius } = themeConfig;
  return (
    <button
      onClick={() => onOpen(gig)}
      className={`text-left w-full p-4 space-y-3 ${colors.bgCardSoft} border ${colors.border} ${radius.lg} ${colors.borderHover} transition`}
    >
      <div>
        <span className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider ${colors.secondarySoftBg} ${colors.secondary} px-2 py-0.5`}>
          {gig.compensation}
        </span>
        <h4 className={`text-sm font-bold ${colors.textWhite} mt-2`}>{gig.role}</h4>
        <p className={`text-[11px] ${colors.textFaint}`}>
          {gig.posted_by}
          {gig.is_remote ? ' · Remote' : gig.location ? ` · ${gig.location}` : ''}
        </p>
      </div>
      {gig.deadline && (
        <p className={`text-[11px] font-semibold ${gigDaysLeft(gig.deadline) <= 7 ? colors.warning : colors.textFaint}`}>
          {gigDaysLeft(gig.deadline) === 0 ? 'Closes today' : `Closes in ${gigDaysLeft(gig.deadline)} days`}
        </p>
      )}
      <p className={`text-xs ${colors.textMuted} line-clamp-2 leading-relaxed`}>{gig.details}</p>
      {(gig.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {gig.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={`text-[10px] ${colors.textFaint} ${colors.bgPill} px-2 py-0.5 border ${colors.border}`}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

/** Pixel block skeleton: shows the shape of a card while data loads. */
export function CardSkeleton({ tall = false }) {
  const { colors, radius } = themeConfig;
  const block = 'bg-md3-surfaceContainerHigh';
  return (
    <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} overflow-hidden`} aria-hidden="true">
      <div className={`${tall ? 'h-24' : 'h-12'} ${block}`} />
      <div className="p-4 space-y-2">
        <div className={`h-4 w-3/4 ${block}`} />
        <div className={`h-3 w-1/3 ${block}`} />
        <div className={`h-3 w-2/3 ${block}`} />
      </div>
    </div>
  );
}
