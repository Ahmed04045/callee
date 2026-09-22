// src/views/create/GigForm.jsx
//
// Gig (business) / Opportunity (personal). Everything that used to be typed
// is now chosen: compensation from a list, tags from a fixed set, location
// via Google Places (or Remote). Always submits as pending (RLS forces it).
//
// The cover photo is picked here but uploaded only after the gig row exists
// (same reason as EventForm's photos: Storage needs a real, owned row to
// check the folder against) — then set_gig_cover_image() attaches it, since
// posters can't otherwise update their own gig row at all (only admins can,
// on purpose — see 002_gig_moderation.sql).

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../components/TelemetryLog';
import { uploadImage, fileExtension } from '../../lib/imageUpload';
import { COMMITMENT_OPTIONS, COMPENSATION_OPTIONS, GIG_TAGS, MAX_TAGS, PAID_COMPENSATIONS } from '../../lib/options';
import { ChipPicker, Field, ImagePicker, SubmitButton, useFormStyles, useImagePicker } from './formKit';
import PlacePicker from './PlacePicker';
import { QuestionBuilder } from '../../components/Questions';
import { cleanForSave } from '../../lib/questions';
import { useT } from '../../i18n';

const DETAILS_MIN = 30;

export default function GigForm({ user, postedBy, kind, onDone }) {
  const { t } = useT();
  const { colors } = themeConfig;
  const { input } = useFormStyles();
  const navigate = useNavigate();
  const isOpportunity = kind === 'opportunity';

  const [role, setRole] = useState('');
  const [compensation, setCompensation] = useState('');
  const [amount, setAmount] = useState('');
  const [tags, setTags] = useState([]);
  const [commitment, setCommitment] = useState('');
  const [remote, setRemote] = useState(false);
  const [place, setPlace] = useState(null);
  const [details, setDetails] = useState('');
  const [deadline, setDeadline] = useState('');
  const [questions, setQuestions] = useState([]);
  const { files: cover, add: addCover, remove: removeCover, error: coverError } = useImagePicker(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!compensation) return setError(t('Choose the compensation type.'));
    if (tags.length === 0) return setError(t('Pick at least one tag.'));
    if (!remote && !place) return setError(t('Choose a location, or mark this as remote.'));
    if (details.trim().length < DETAILS_MIN) return setError(`Details need at least ${DETAILS_MIN} characters.`);

    setBusy(true);
    logUserAction('CREATE_POST_SUBMIT', { kind });
    const compensationLabel = PAID_COMPENSATIONS.includes(compensation) && amount.trim() ? `${compensation} · ${amount.trim()}` : compensation;
    const { data, error: insertError } = await supabase
      .from('gigs')
      .insert({
        role: role.trim(),
        posted_by: postedBy,
        posted_by_user_id: user.id,
        compensation: compensationLabel,
        tags,
        commitment: commitment || null,
        details: details.trim(),
        kind,
        status: 'pending',
        is_remote: remote,
        deadline: deadline || null,
        questions: cleanForSave(questions).length ? cleanForSave(questions) : null,
        location: remote ? null : place.name,
        place_id: remote ? null : place.placeId,
        lat: remote ? null : place.lat,
        lng: remote ? null : place.lng,
      })
      .select()
      .single();
    if (insertError) {
      setBusy(false);
      return setError(insertError.message);
    }

    if (cover[0]) {
      const path = `${data.id}/${Date.now()}.${fileExtension(cover[0].file)}`;
      const { url } = await uploadImage('gig-photos', path, cover[0].file);
      if (url) await supabase.rpc('set_gig_cover_image', { p_gig_id: data.id, p_url: url });
    }

    setBusy(false);
    onDone?.();
    navigate(`/gigs/${data.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={isOpportunity ? t('What are you offering?') : t('Role / title')}>
        <input className={input} required maxLength={100} value={role} onChange={(e) => setRole(e.target.value)} />
      </Field>

      <Field label={t('Cover photo')} hint={t('(optional)')}>
        <ImagePicker files={cover} onAdd={addCover} onRemove={removeCover} max={1} />
        {coverError && <p className={`text-xs ${colors.error} mt-1.5`}>{coverError}</p>}
      </Field>

      <Field label={t('Compensation')}>
        <ChipPicker options={COMPENSATION_OPTIONS} value={compensation} onChange={setCompensation} />
        {PAID_COMPENSATIONS.includes(compensation) && (
          <input className={input} maxLength={40} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('Amount, e.g. 500 QAR / project (optional)')} />
        )}
      </Field>

      <Field label={t('Tags')} hint={t('(up to {n})', { n: MAX_TAGS })}>
        <ChipPicker multiple max={MAX_TAGS} options={GIG_TAGS} value={tags} onChange={setTags} />
      </Field>

      <Field label={t('Time commitment')} hint={t('(optional)')}>
        <select className={input} value={commitment} onChange={(e) => setCommitment(e.target.value)}>
          <option value="">{t('Select…')}</option>
          {COMMITMENT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{t(opt)}</option>
          ))}
        </select>
      </Field>

      <Field label={t('Location')}>
        <label className={`flex items-center justify-between mt-1 mb-2 text-xs ${colors.textMuted}`}>
          {t('Remote — no fixed location')}
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} className="accent-md3-primary" />
        </label>
        {!remote && <PlacePicker value={place} onChange={setPlace} />}
      </Field>

      <Field label={t('Application deadline')} hint={t('(optional)')}>
        <input type="date" className={input} min={new Date().toLocaleDateString('en-CA')} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>

      <Field
        label={t('Details')}
        right={<span className={`text-[10px] ${details.trim().length < DETAILS_MIN ? colors.error : colors.success}`}>{details.trim().length}/{DETAILS_MIN}+</span>}
      >
        <textarea className={`${input} resize-none`} required rows={4} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
      </Field>

      <Field label={t('Questions for applicants')} hint={t('(optional)')}>
        <QuestionBuilder value={questions} onChange={setQuestions} hint={t('Ask applicants anything you need to know. You\'ll see their answers next to each application.')} />
      </Field>

      {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
      <SubmitButton busy={busy} />
    </form>
  );
}
