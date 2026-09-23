// src/components/IdentityWord.jsx
//
// Replaces the old "Aura" score. Answer a handful of short questions about
// yourself and Gemini gives back one word for who you are — shown as a
// banner on the profile — plus a short note on why, revealed when it's
// tapped. Nothing scored, nothing to compare against anyone else.
//
// `IdentityWordQuiz` is the question form; `IdentityWordBanner` is what
// shows on the profile (the "find your word" prompt when there isn't one
// yet, the word itself once there is).

import { useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { supabase } from '../lib/supabaseClient';
import { IDENTITY_QUESTIONS } from '../lib/identityWord';
import Icon from './Icon';
import { useT } from '../i18n';

export function IdentityWordQuiz({ onSaved, onClose }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const [answers, setAnswers] = useState(() => IDENTITY_QUESTIONS.map(() => ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setAnswer = (i, value) => setAnswers((prev) => prev.map((a, idx) => (idx === i ? value : a)));

  const submit = async () => {
    if (answers.some((a) => !a.trim())) return setError(t('Answer every question — short answers are fine.'));
    setError('');
    setBusy(true);
    const { data, error: fnError } = await supabase.functions.invoke('identity-word', { body: { answers } });
    setBusy(false);
    if (fnError || data?.error) return setError(data?.error || fnError?.message || t('Something went wrong.'));
    onSaved(data.word, data.reason);
  };

  return (
    <div className="fixed inset-0 z-[91] flex items-end sm:items-center justify-center bg-black/60 sm:px-4 animate-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('Find your word')} onClick={onClose}>
      <div className={`w-full sm:max-w-lg max-h-[92vh] overflow-y-auto ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} p-5 space-y-5 animate-modal-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={`text-lg font-bold ${colors.textWhite}`}>{t('Find your word')}</h2>
            <p className={`text-xs ${colors.textFaint} mt-1`}>{t('Answer honestly — short is fine. We’ll give you one word for who you are.')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Close')} className={colors.textFaint}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {IDENTITY_QUESTIONS.map((q, i) => (
            <label key={q} className="block">
              <span className={`text-xs font-semibold ${colors.textWhite}`}>{t(q)}</span>
              <textarea
                className={`w-full mt-1.5 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary resize-none`}
                rows={2}
                maxLength={300}
                value={answers[i]}
                onChange={(e) => setAnswer(i, e.target.value)}
              />
            </label>
          ))}
        </div>

        {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
        <button type="button" onClick={submit} disabled={busy} className={`w-full ${colors.accentBg} ${colors.accentOn} font-bold text-sm py-2.5 ${radius.full} disabled:opacity-50`}>
          {busy ? t('Thinking…') : t('Reveal my word')}
        </button>
      </div>
    </div>
  );
}

export function IdentityWordBanner({ word, reason, own, onFind }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const [open, setOpen] = useState(false);

  if (!word) {
    if (!own) return null;
    return (
      <button
        type="button"
        onClick={onFind}
        className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 ${radius.full} border border-dashed ${colors.borderStrong} ${colors.textMuted}`}
      >
        <Icon name="auto_awesome" size={14} /> {t('Find your word')}
      </button>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`w-full flex items-center justify-center gap-2 py-3 ${radius.full} ${colors.accentBg} ${colors.accentOn}`}>
        <Icon name="auto_awesome" size={16} className="text-inherit" />
        <span className="font-bold">{word}</span>
        <span className="text-xs opacity-70">{t('— tap to see why')}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[91] flex items-end sm:items-center justify-center bg-black/60 sm:px-4 animate-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className={`w-full sm:max-w-sm ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} p-5 space-y-3 animate-modal-in`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className={`text-lg font-bold ${colors.accent}`}>{word}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('Close')} className={colors.textFaint}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <p className={`text-sm ${colors.textMuted} leading-relaxed`}>{reason}</p>
            {own && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onFind();
                }}
                className={`text-xs font-semibold ${colors.accent}`}
              >
                {t('Answer again')}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
