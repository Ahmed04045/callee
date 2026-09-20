// src/views/create/GigForm.jsx
//
// Gig (business) / Opportunity (personal). Everything that used to be typed
// is now chosen: compensation from a list, tags from a fixed set, location
// via Google Places (or Remote). Always submits as pending (RLS forces it).

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../components/TelemetryLog';
import { COMPENSATION_OPTIONS, GIG_TAGS, MAX_TAGS, PAID_COMPENSATIONS } from '../../lib/options';
import { ChipPicker, Field, SubmitButton, useFormStyles } from './formKit';
import PlacePicker from './PlacePicker';

const DETAILS_MIN = 30;

export default function GigForm({ user, postedBy, kind }) {
  const { colors } = themeConfig;
  const { input } = useFormStyles();
  const navigate = useNavigate();
  const isOpportunity = kind === 'opportunity';

  const [role, setRole] = useState('');
  const [compensation, setCompensation] = useState('');
  const [amount, setAmount] = useState('');
  const [tags, setTags] = useState([]);
  const [remote, setRemote] = useState(false);
  const [place, setPlace] = useState(null);
  const [details, setDetails] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!compensation) return setError('Choose the compensation type.');
    if (tags.length === 0) return setError('Pick at least one tag.');
    if (!remote && !place) return setError('Choose a location, or mark this as remote.');
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
        details: details.trim(),
        kind,
        status: 'pending',
        is_remote: remote,
        deadline: deadline || null,
        location: remote ? null : place.name,
        place_id: remote ? null : place.placeId,
        lat: remote ? null : place.lat,
        lng: remote ? null : place.lng,
      })
      .select()
      .single();
    setBusy(false);
    if (insertError) return setError(insertError.message);
    navigate(`/gigs/${data.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={isOpportunity ? 'What are you offering?' : 'Role / title'}>
        <input className={input} required maxLength={100} value={role} onChange={(e) => setRole(e.target.value)} />
      </Field>

      <Field label="Compensation">
        <ChipPicker options={COMPENSATION_OPTIONS} value={compensation} onChange={setCompensation} />
        {PAID_COMPENSATIONS.includes(compensation) && (
          <input className={input} maxLength={40} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount, e.g. 500 QAR / project (optional)" />
        )}
      </Field>

      <Field label="Tags" hint={`(up to ${MAX_TAGS})`}>
        <ChipPicker multiple max={MAX_TAGS} options={GIG_TAGS} value={tags} onChange={setTags} />
      </Field>

      <Field label="Location">
        <label className={`flex items-center justify-between mt-1 mb-2 text-xs ${colors.textMuted}`}>
          Remote — no fixed location
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} className="accent-md3-primary" />
        </label>
        {!remote && <PlacePicker value={place} onChange={setPlace} />}
      </Field>

      <Field label="Application deadline" hint="(optional)">
        <input type="date" className={input} min={new Date().toLocaleDateString('en-CA')} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>

      <Field
        label="Details"
        right={<span className={`text-[10px] ${details.trim().length < DETAILS_MIN ? colors.error : colors.success}`}>{details.trim().length}/{DETAILS_MIN}+</span>}
      >
        <textarea className={`${input} resize-none`} required rows={4} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
      </Field>

      {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
      <SubmitButton busy={busy} />
    </form>
  );
}
