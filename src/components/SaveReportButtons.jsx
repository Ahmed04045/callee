// src/components/SaveReportButtons.jsx
//
// SaveButton: bookmark an event / gig / club (saved_items table, own rows only).
// ReportButton: flag a listing for the admins (reports table). Both need a
// signed-in user; signed-out visitors are sent to the sign-in dialog.
// Tables are created in 012_tickets_saves_reports_applicants.sql.

import React, { useEffect, useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Icon from './Icon';
import { useT } from '../i18n';

export function SaveButton({ kind, itemId, onNeedAuth }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSaved(false);
    if (!user) return undefined;
    let active = true;
    supabase
      .from('saved_items')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('kind', kind)
      .eq('item_id', String(itemId))
      .maybeSingle()
      .then(({ data }) => active && setSaved(Boolean(data)));
    return () => {
      active = false;
    };
  }, [user, kind, itemId]);

  const toggle = async () => {
    if (!user) return onNeedAuth?.();
    setBusy(true);
    const next = !saved;
    setSaved(next); // optimistic
    const query = next
      ? supabase.from('saved_items').insert({ user_id: user.id, kind, item_id: String(itemId) })
      : supabase.from('saved_items').delete().eq('user_id', user.id).eq('kind', kind).eq('item_id', String(itemId));
    const { error } = await query;
    if (error && !/duplicate/i.test(error.message)) setSaved(!next);
    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 border ${radius.full} ${saved ? `${colors.accentSoftBg} ${colors.accent} border-md3-primary` : `${colors.textMuted} ${colors.borderStrong} ${colors.bgHoverInset}`}`}
    >
      <Icon name={saved ? 'check_circle' : 'star'} size={14} className="text-inherit" /> {saved ? t('Saved') : t('Save')}
    </button>
  );
}

const REASONS = [
  ['spam', 'Spam'],
  ['scam', 'Scam or fake'],
  ['inappropriate', 'Inappropriate'],
  ['wrong_info', 'Wrong information'],
  ['other', 'Something else'],
];

export function ReportButton({ kind, itemId, onNeedAuth }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [message, setMessage] = useState('');

  const send = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setState('sending');
    const { error } = await supabase
      .from('reports')
      .insert({ reporter_id: user.id, kind, item_id: String(itemId), reason, details: details.trim() || null });
    if (error && /duplicate/i.test(error.message)) {
      setState('done');
      setMessage(t('You already reported this. Thank you, we’ll take a look.'));
    } else if (error) {
      setState('error');
      setMessage(error.message);
    } else {
      setState('done');
      setMessage(t('Thanks for letting us know. An admin will review it.'));
    }
  };

  return (
    <>
      <button
        onClick={() => (user ? setOpen(true) : onNeedAuth?.())}
        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 border ${radius.full} ${colors.textFaint} ${colors.borderStrong} ${colors.bgHoverInset}`}
      >
        <Icon name="gpp_maybe" size={14} className="text-inherit" /> {t('Report')}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-label={t('Report')}>
          <form onSubmit={send} className={`w-full max-w-sm ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} p-5 space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${colors.textWhite}`}>{t('Report this {kind}', { kind: t(kind) })}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('Close')} className={colors.textFaint}><Icon name="close" size={18} /></button>
            </div>

            {state === 'done' ? (
              <>
                <p className={`text-sm ${colors.success}`}>{message}</p>
                <button type="button" onClick={() => setOpen(false)} className={`w-full ${colors.accentBg} ${colors.accentOn} font-bold text-sm py-2.5 ${radius.full}`}>{t('Close')}</button>
              </>
            ) : (
              <>
                <fieldset className="space-y-2">
                  <legend className={`text-[11px] font-semibold ${colors.textFaint} mb-1`}>{t('What\'s wrong?')}</legend>
                  {REASONS.map(([id, label]) => (
                    <label key={id} className={`flex items-center gap-3 p-2.5 border ${reason === id ? 'border-md3-primary' : colors.border} ${radius.md} cursor-pointer`}>
                      <input type="radio" name="reason" value={id} checked={reason === id} onChange={() => setReason(id)} className="accent-md3-primary" />
                      <span className={`text-sm ${colors.textWhite}`}>{t(label)}</span>
                    </label>
                  ))}
                </fieldset>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder={t('Anything else we should know? (optional)')}
                  className={`w-full ${colors.bgInset} border ${colors.border} ${radius.md} px-3 py-2 text-sm ${colors.textPrimary} outline-none focus:border-md3-primary resize-none`}
                />
                {state === 'error' && <p className={`text-xs ${colors.error}`}>{message}</p>}
                <button disabled={!reason || state === 'sending'} className={`w-full ${colors.accentBg} ${colors.accentOn} font-bold text-sm py-2.5 ${radius.full} disabled:opacity-50`}>
                  {state === 'sending' ? t('Sending…') : t('Send report')}
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
