// src/views/EventScanView.jsx
//
// Organizer check-in screen (/events/:id/scan): point the phone camera at
// attendees' QR codes. Uses the browser's built-in BarcodeDetector where it
// exists (Chrome/Edge on Android and desktop). Where it doesn't (e.g. Safari),
// use the phone's normal camera app instead (the QR is a link that checks the
// ticket in) or type the code. Every decision comes from check_in_ticket() in
// the database; this page only shows the result.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';
import { useT } from '../i18n';

const LABEL = {
  OK: { text: 'Checked in', tone: 'success', icon: 'check_circle' },
  ALREADY: { text: 'Already checked in', tone: 'warning', icon: 'hourglass_top' },
  FORBIDDEN: { text: 'Not allowed', tone: 'error', icon: 'cancel' },
  OWN_TICKET: { text: 'Not allowed', tone: 'error', icon: 'cancel' },
  NOT_FOUND: { text: 'Invalid ticket', tone: 'error', icon: 'cancel' },
  WRONG_EVENT: { text: 'Ticket is for a different event', tone: 'error', icon: 'cancel' },
};

// Accepts a full ticket URL or a bare code.
const extractCode = (text) => {
  const m = /\/ticket\/([A-Za-z0-9]+)/.exec(text);
  return (m ? m[1] : text).trim().toUpperCase();
};

export default function EventScanView() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading');
  const [log, setLog] = useState([]);
  const [manual, setManual] = useState('');
  const [cameraState, setCameraState] = useState('idle'); // idle | on | unsupported | denied
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastRef = useRef({ code: '', at: 0 });

  useEffect(() => {
    supabase.from('events').select('id,title,posted_by_user_id').eq('id', id).maybeSingle().then(({ data }) => {
      setEvent(data);
      setStatus(data ? 'ready' : 'notFound');
    });
  }, [id]);

  const canScan = Boolean(event) && (isAdmin || event.posted_by_user_id === user?.id);

  const submit = useCallback(
    async (raw) => {
      const code = extractCode(raw);
      if (!code) return;
      const now = Date.now();
      if (lastRef.current.code === code && now - lastRef.current.at < 4000) return; // ignore the same QR held in view
      lastRef.current = { code, at: now };

      const { data, error } = await supabase.rpc('check_in_ticket', { p_code: code });
      let result = error ? { status: 'NOT_FOUND' } : data;
      if (result.event_id && result.event_id !== id && (result.status === 'OK' || result.status === 'ALREADY')) {
        // Checked in for another of *your* events by mistake: undo and warn.
        if (result.status === 'OK') await supabase.rpc('set_check_in', { p_attendee_id: result.attendee_id, p_checked: false });
        result = { status: 'WRONG_EVENT', name: result.name, event_title: result.event_title };
      }
      navigator.vibrate?.(result.status === 'OK' ? 60 : [40, 60, 40]);
      setLog((prev) => [{ ...result, code, at: new Date() }, ...prev].slice(0, 8));
    },
    [id]
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraState('idle');
  }, []);

  const startCamera = async () => {
    if (!('BarcodeDetector' in window)) return setCameraState('unsupported');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraState('on');
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found[0]?.rawValue) await submit(found[0].rawValue);
        } catch {
          /* frame not ready yet */
        }
        setTimeout(tick, 250);
      };
      tick();
    } catch {
      setCameraState('denied');
    }
  };

  useEffect(() => stopCamera, [stopCamera]);

  if (status === 'loading') return <p className={`text-xs ${colors.textFaint}`}>{t('Loading…')}</p>;
  if (!canScan) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-3 text-center">
        <p className={`text-sm ${colors.textMuted}`}>{t('Only the organizer of this event can check tickets in.')}</p>
        <Link to={`/events/${id}`} className={`text-xs font-semibold ${colors.accent}`}>{t('Back to the event')}</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      <SubPageHeader title={t('Scan tickets')} fallbackTo={`/events/${id}/manage`} />
      <p className={`text-sm ${colors.textMuted}`}>{event.title}</p>

      <div className={`relative aspect-square bg-black ${radius.lg} overflow-hidden border ${colors.borderStrong}`}>
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        {cameraState !== 'on' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-white/80">
              {cameraState === 'unsupported' && t('This browser cannot scan in the page. Use your phone camera app on the QR code, or type the code below.')}
              {cameraState === 'denied' && t('Camera access was blocked. Allow it in your browser settings, or type the code below.')}
              {cameraState === 'idle' && t('Point the camera at a ticket QR code.')}
            </p>
            <button onClick={startCamera} className={`${colors.accentBg} ${colors.accentOn} font-bold text-sm px-5 py-2.5 ${radius.full}`}>{t('Start camera')}</button>
          </div>
        )}
        {cameraState === 'on' && (
          <button onClick={stopCamera} className="absolute bottom-3 end-3 text-xs font-bold bg-black/70 text-white px-3 py-1.5">{t('Stop')}</button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(manual);
          setManual('');
        }}
        className="flex gap-2"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder={t('Type a ticket code')}
          maxLength={80}
          className={`flex-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm font-mono uppercase ${colors.textPrimary} outline-none focus:border-md3-primary`}
        />
        <button className={`${colors.accentBg} ${colors.accentOn} font-bold text-sm px-4 ${radius.full}`}>{t('Check in')}</button>
      </form>

      <div className="space-y-2" aria-live="polite">
        {log.map((r, i) => {
          const meta = LABEL[r.status] ?? LABEL.NOT_FOUND;
          return (
            <div key={`${r.code}-${r.at.getTime()}`} className={`flex items-center gap-3 p-3 ${colors.bgCard} border ${colors.border} ${radius.md} ${i === 0 ? 'border-md3-outline' : ''}`}>
              <Icon name={meta.icon} size={22} className={colors[meta.tone]} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${colors.textWhite} truncate`}>{r.name ?? t(meta.text)}</p>
                <p className={`text-[11px] ${colors[meta.tone]}`}>{t(meta.text)}</p>
              </div>
              <span className={`text-[10px] font-mono ${colors.textFaint}`}>{r.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
