// src/components/TicketCard.jsx
//
// A ticket: event, when/where, holder, a scannable QR and the ticket code.
// The QR encodes a link (/ticket/<code>). Scanning it with any phone camera
// opens that page; if the person scanning is the organizer, it checks the
// ticket in. Anyone else just sees their own ticket or a "not allowed" note.
// "Print" gives a clean printable copy (see the print rules in index.css).

import React, { useState } from 'react';
import QRCode from 'qrcode';
import { downloadBlob } from '../lib/download';
import { eventCalendar } from '../lib/eventCalendar';
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
  const { id: eventId } = event;
  const { ticket_code: ticketCode } = ticket;
  const used = Boolean(ticket.checked_in_at);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const downloadQr = async () => {
    setBusy(true);
    setError('');
    try {
      const canvas = await QRCode.toCanvas(ticketUrl(ticketCode), { width: 768, margin: 4, errorCorrectionLevel: 'M' });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('No image');
      downloadBlob(blob, `ticket-${ticketCode}.png`);
    } catch {
      setError('Could not download the QR code. Please try again.');
    } finally { setBusy(false); }
  };

  const downloadCalendar = () => {
    setError('');
    try {
      downloadBlob(new Blob([eventCalendar(event, window.location.origin)], { type: 'text/calendar;charset=utf-8' }), `event-${eventId}.ics`);
    } catch { setError('Could not create the calendar file.'); }
  };

  return (
    <article className={`ticket-print ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} overflow-hidden`} aria-label={t('Ticket for {title}', { title: event.title })}>
      <div className="h-10">
        <PixelCover seed={eventId} cols={72} rows={6} />
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
              {ticketCode}
            </span>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 ${used ? `${colors.bgPill} ${colors.textMuted}` : 'bg-md3-success/15 text-md3-success'}`}>
              {used ? t('Checked in') : t('Valid')}
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-wider ${colors.textFaint}`}>
              {event.is_free === false ? event.price || t('Paid entry') : t('Free entry')}
            </span>
          </div>
        </div>
        <div className="mx-auto shrink-0 border-2 border-md3-onSurface/70 bg-white p-1">
          <TicketQR value={ticketUrl(ticketCode)} size={compact ? 140 : 168} />
        </div>
      </div>
      <div className="px-5 pb-5 flex flex-wrap gap-2 print:hidden">
        <button onClick={downloadQr} disabled={busy} className={`text-xs font-bold px-3 py-2 border ${colors.borderStrong} ${radius.full} disabled:opacity-50`}>
          {t(busy ? 'Preparing download…' : 'Download QR code')}
        </button>
        <button onClick={downloadCalendar} className={`text-xs font-bold px-3 py-2 border ${colors.borderStrong} ${radius.full}`}>{t('Add to calendar')}</button>
        {error && <p role="alert" className={`w-full text-xs ${colors.error}`}>{t(error)}</p>}
      </div>
    </article>
  );
}
