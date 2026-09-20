// src/views/TicketCheckView.jsx
//
// Where a scanned QR lands (/ticket/<code>). If the person who opened it is
// the event's organizer (or an admin), the ticket is checked in right away and
// the result is shown big and clear. Everyone else gets a friendly note (their
// own ticket → link to it; someone else's → not allowed). The database
// function check_in_ticket() makes all of these decisions; this page only
// displays the answer.

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Icon from '../components/Icon';
import { PixelEmpty } from '../components/Pixel';
import { useT } from '../i18n';

const RESULTS = {
  OK: { icon: 'check_circle', tone: 'success', title: 'Checked in', text: 'Welcome in.' },
  ALREADY: { icon: 'hourglass_top', tone: 'warning', title: 'Already checked in', text: 'This ticket was used earlier.' },
  OWN_TICKET: { icon: 'event_available', tone: 'accent', title: 'This is your ticket', text: 'Only the organizer can check tickets in. Show them this QR code at the door.' },
  FORBIDDEN: { icon: 'cancel', tone: 'error', title: 'Not allowed', text: 'Only the event organizer can check this ticket in.' },
  NOT_FOUND: { icon: 'search_off', tone: 'error', title: 'Ticket not found', text: 'This code is not valid. It may have been cancelled.' },
};

export default function TicketCheckView({ onOpenAuthModal }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { code } = useParams();
  const { user, status: authStatus } = useAuth();
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    setBusy(true);
    supabase.rpc('check_in_ticket', { p_code: code }).then(({ data, error }) => {
      if (!active) return;
      setResult(error ? { status: 'ERROR', message: error.message } : data);
      setBusy(false);
    });
    return () => {
      active = false;
    };
  }, [user, code]);

  const undo = async () => {
    if (!result?.attendee_id) return;
    setBusy(true);
    const { error } = await supabase.rpc('set_check_in', { p_attendee_id: result.attendee_id, p_checked: false });
    if (!error) setResult({ ...result, status: 'UNDONE' });
    setBusy(false);
  };

  if (authStatus === 'loading') return null;
  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4 px-4">
        <PixelEmpty sprite="box" title={t('Sign in to use this ticket')}>
          {t('Organizers: sign in to check people in. Attendees: sign in to see your ticket.')}
        </PixelEmpty>
        <button onClick={() => onOpenAuthModal?.()} className={`${colors.accentBg} ${colors.accentOn} font-bold text-sm px-5 py-2.5 ${radius.full}`}>{t('Sign in')}</button>
      </div>
    );
  }

  const meta = result?.status === 'UNDONE'
    ? { icon: 'restart_alt', tone: 'accent', title: 'Check-in undone', text: 'The ticket is valid again.' }
    : RESULTS[result?.status];

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      {busy && !result && <p className={`text-center text-sm ${colors.textFaint}`}>{t('Checking ticket…')}</p>}
      {result?.status === 'ERROR' && <p className={`text-center text-sm ${colors.error}`}>{result.message}</p>}
      {meta && (
        <div className={`${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} p-8 text-center space-y-4`}>
          <Icon name={meta.icon} size={56} className={`mx-auto ${colors[meta.tone]}`} />
          <h1 className={`text-2xl font-bold ${colors.textWhite}`}>{t(meta.title)}</h1>
          {result.name && <p className={`text-xl font-display font-bold ${colors.textWhite}`}>{result.name}</p>}
          {result.event_title && <p className={`text-sm ${colors.textMuted}`}>{result.event_title}</p>}
          <p className={`text-xs ${colors.textFaint}`}>{t(meta.text)}</p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            {(result.status === 'OK' || result.status === 'ALREADY') && (
              <button onClick={undo} disabled={busy} className={`text-xs font-bold px-4 py-2 border ${colors.borderStrong} ${colors.textWhite} ${radius.full}`}>{t('Undo check-in')}</button>
            )}
            {result.event_id && (result.status === 'OK' || result.status === 'ALREADY') && (
              <Link to={`/events/${result.event_id}/scan`} className={`text-xs font-bold px-4 py-2 ${colors.accentBg} ${colors.accentOn} ${radius.full}`}>{t('Scan next ticket')}</Link>
            )}
            {result.status === 'OWN_TICKET' && (
              <Link to="/tickets" className={`text-xs font-bold px-4 py-2 ${colors.accentBg} ${colors.accentOn} ${radius.full}`}>{t('Open my tickets')}</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
