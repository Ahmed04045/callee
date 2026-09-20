// src/components/TicketCard.jsx
//
// A ticket: event, when/where, holder, a scannable QR and the ticket code.
// The QR encodes a link (/ticket/<code>). Scanning it with any phone camera
// opens that page; if the person scanning is the organizer, it checks the
// ticket in. Anyone else just sees their own ticket or a "not allowed" note.
// "Print" gives a clean printable copy (see the print rules in index.css).

import React from 'react';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';
import TicketQR from './TicketQR';
import { PixelCover } from './Pixel';
import { formatLongDate } from './FeedCards';
import { useT } from '../i18n';

export const ticketUrl = (code) => `${window.location.origin}/ticket/${code}`;

export default function TicketCard({ event, ticket, holderName, compact = false }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const used = Boolean(ticket.checked_in_at);

  return (
    <article className={`ticket-print ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} overflow-hidden`} aria-label={t('Ticket for {title}', { title: event.title })}>
      <div className="h-10">
        <PixelCover seed={event.id} cols={72} rows={6} />
      </div>
      <div className={`p-5 grid ${compact ? '' : 'sm:grid-cols-[1fr_auto]'} gap-5 items-center`}>
        <div className="space-y-3 min-w-0">
          <div>
            <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${colors.accent}`}>{t('Admit one')}</p>
            <h3 className={`text-xl font-bold ${colors.textWhite} leading-snug`}>{event.title}</h3>
            <p className={`text-xs ${colors.textMuted}`}>{t('By {name}', { name: event.organizer })}</p>
          </div>
          <dl className={`text-xs ${colors.textMuted} space-y-1.5`}>
            <div className="flex items-center gap-2"><Icon name="calendar_today" size={14} className={colors.textFaint} /> {formatLongDate(event.event_date, event.start_time)}</div>
            {event.location && <div className="flex items-center gap-2 min-w-0"><Icon name="location_on" size={14} className={colors.textFaint} /> <span className="truncate">{event.location}</span></div>}
            {holderName && <div className="flex items-center gap-2"><Icon name="person" size={14} className={colors.textFaint} /> {holderName}</div>}
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 border ${colors.border} ${colors.textWhite}`}>
              {ticket.ticket_code}
            </span>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 ${used ? `${colors.bgPill} ${colors.textMuted}` : 'bg-md3-success/15 text-md3-success'}`}>
              {used ? t('Checked in') : t('Valid')}
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-wider ${colors.textFaint}`}>{t('Free entry')}</span>
          </div>
        </div>
        <div className="mx-auto shrink-0 border-2 border-md3-onSurface/70 bg-white p-1">
          <TicketQR value={ticketUrl(ticket.ticket_code)} size={compact ? 140 : 168} />
        </div>
      </div>
    </article>
  );
}
