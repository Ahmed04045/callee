// src/components/AnswerModal.jsx
//
// The dialog people see when they apply to a gig, request to join a group or RSVP
// to an event that asks questions. It shows the questions, an optional cover
// message and (for gigs) a contact method the applicant chooses. It only collects
// and validates input; the caller's `onSubmit` does the actual save and returns
// an error message (or null on success). The database re-checks everything.

import React, { useState } from 'react';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';
import { AnswerForm } from './Questions';
import { firstMissingRequired } from '../lib/questions';
import { APPLICATION_CONTACT_METHODS, validateContact } from '../lib/options';
import { useT } from '../i18n';

export default function AnswerModal({ title, intro, shares, questions = [], withMessage = false, messageLabel, withContact = false, submitLabel = 'Submit', onSubmit, onClose }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('');
  const [contactMethod, setContactMethod] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const input = `w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary`;
  const method = APPLICATION_CONTACT_METHODS.find((m) => m.id === contactMethod);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const missing = firstMissingRequired(questions, answers);
    if (missing) return setError(`Please answer: ${missing}`);
    let contact = { ok: true, value: null };
    if (withContact) {
      contact = validateContact(contactMethod, contactValue, APPLICATION_CONTACT_METHODS);
      if (!contact.ok) return setError(contact.error);
    }
    setBusy(true);
    const problem = await onSubmit({
      answers,
      message: message.trim() || null,
      contact_method: withContact ? contactMethod : null,
      contact_value: withContact ? contact.value : null,
    });
    setBusy(false);
    if (problem) setError(problem);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 sm:px-4 animate-modal-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <form onSubmit={submit} className={`w-full max-w-lg max-h-[92vh] overflow-y-auto ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} p-5 space-y-5 animate-modal-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={`text-lg font-bold ${colors.textWhite}`}>{title}</h2>
            {intro && <p className={`text-xs ${colors.textMuted} mt-1`}>{intro}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t('Close')} className={colors.textFaint}><Icon name="close" size={20} /></button>
        </div>

        {questions.length > 0 && <AnswerForm questions={questions} answers={answers} onChange={setAnswers} />}

        {withMessage && (
          <label className="block">
            <span className={`text-xs font-semibold ${colors.textWhite}`}>{messageLabel ?? t('Message (optional)')}</span>
            <textarea className={`${input} resize-none mt-1.5`} rows={3} maxLength={withContact ? 1000 : 300} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
        )}

        {withContact && (
          <fieldset className="space-y-1.5">
            <legend className={`text-xs font-semibold ${colors.textWhite}`}>{t('How can they reach you?')}</legend>
            <div className="grid grid-cols-2 gap-2">
              <select className={input} value={contactMethod} aria-label={t('Contact method')} onChange={(e) => { setContactMethod(e.target.value); setContactValue(''); }}>
                <option value="" disabled>{t('Select…')}</option>
                {APPLICATION_CONTACT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>{t(m.label)}</option>
                ))}
              </select>
              <input className={input} maxLength={80} disabled={!method} aria-label={t('Contact details')} value={contactValue} onChange={(e) => setContactValue(e.target.value)} placeholder={method?.placeholder ?? ''} inputMode={method?.kind === 'phone' ? 'tel' : 'text'} />
            </div>
          </fieldset>
        )}

        {shares && <p className={`text-[11px] ${colors.textFaint} leading-relaxed`}>{shares}</p>}
        {error && <p className={`text-xs ${colors.error}`} role="alert">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className={`flex-1 border ${colors.borderStrong} ${colors.textWhite} font-bold text-sm py-2.5 ${radius.full}`}>{t('Cancel')}</button>
          <button disabled={busy} className={`flex-1 ${colors.accentBg} ${colors.accentOn} font-bold text-sm py-2.5 ${radius.full} disabled:opacity-60`}>{busy ? t('Sending…') : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
