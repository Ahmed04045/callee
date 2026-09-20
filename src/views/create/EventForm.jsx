// src/views/create/EventForm.jsx
//
// Event: type is chosen, date/time use pickers (no past dates), location
// comes from Google Places (which also gives Discover its map pin), contact
// details are validated per method. Lands as pending.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../components/TelemetryLog';
import { CONTACT_METHODS, EVENT_TYPES, validateContact } from '../../lib/options';
import { ChipPicker, Field, SubmitButton, todayISO, useFormStyles } from './formKit';
import PlacePicker from './PlacePicker';
import { QuestionBuilder } from '../../components/Questions';
import { cleanForSave } from '../../lib/questions';

const DESCRIPTION_MIN = 50;

export default function EventForm({ user, postedBy }) {
  const { colors } = themeConfig;
  const { input } = useFormStyles();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState(null);
  const [contactMethod, setContactMethod] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [capacityHidden, setCapacityHidden] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const method = CONTACT_METHODS.find((m) => m.id === contactMethod);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!type) return setError('Choose an event type.');
    if (!date || date < todayISO()) return setError('Pick a date that is today or later.');
    if (!place) return setError('Choose the location from the search suggestions.');
    const contact = validateContact(contactMethod, contactValue);
    if (!contact.ok) return setError(contact.error);
    if (description.trim().length < DESCRIPTION_MIN) return setError(`Description needs at least ${DESCRIPTION_MIN} characters.`);
    const seats = Number(capacity);
    if (!Number.isInteger(seats) || seats <= 0 || seats > 100000) return setError('Capacity must be a whole number above 0.');

    setBusy(true);
    logUserAction('CREATE_POST_SUBMIT', { kind: 'event' });
    const { data, error: insertError } = await supabase
      .from('events')
      .insert({
        title: name.trim(),
        organizer: postedBy,
        posted_by_user_id: user.id,
        event_date: date,
        start_time: time || null,
        location: place.name,
        place_id: place.placeId,
        lat: place.lat,
        lng: place.lng,
        tag: type,
        event_type: type,
        description: description.trim(),
        contact_method: contactMethod,
        contact_value: contact.value,
        capacity: seats,
        capacity_hidden: capacityHidden,
        questions: cleanForSave(questions).length ? cleanForSave(questions) : null,
        spots: seats, // no RSVPs yet — kept in sync by a DB trigger from here on
        status: 'pending',
      })
      .select()
      .single();
    setBusy(false);
    if (insertError) return setError(insertError.message);
    // Photos are added from the event's own page (needs a real event id for Storage permissions).
    navigate(`/events/${data.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Event name">
        <input className={input} required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field label="Event type">
        <ChipPicker options={EVENT_TYPES} value={type} onChange={setType} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Date">
          <input type="date" className={input} required min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Start time" hint="(optional)">
          <input type="time" className={input} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>

      <Field label="Location">
        <PlacePicker value={place} onChange={setPlace} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Contact via">
          <select className={input} required value={contactMethod} onChange={(e) => { setContactMethod(e.target.value); setContactValue(''); }}>
            <option value="" disabled>Select…</option>
            {CONTACT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Field label={' '}>
          <input
            className={input}
            required
            maxLength={40}
            disabled={!method}
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            placeholder={method?.placeholder ?? 'Pick a method first'}
            inputMode={method?.kind === 'phone' ? 'tel' : 'text'}
          />
        </Field>
      </div>

      <Field
        label="Description"
        hint="(50+ characters)"
        right={<span className={`text-[10px] ${description.trim().length < DESCRIPTION_MIN ? colors.error : colors.success}`}>{description.trim().length}/{DESCRIPTION_MIN}</span>}
      >
        <textarea className={`${input} resize-none`} required rows={4} maxLength={800} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <Field label="Capacity" hint="(required — can be hidden below)">
        <input type="number" inputMode="numeric" className={input} required min={1} step={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </Field>

      <label className={`flex items-center justify-between p-3 ${colors.bgInset} rounded-xl border ${colors.border}`}>
        <span className={`text-xs ${colors.textMuted}`}>Hide seat count from public listing</span>
        <input type="checkbox" checked={capacityHidden} onChange={(e) => setCapacityHidden(e.target.checked)} className="accent-md3-primary" />
      </label>
      <p className={`text-[10px] ${colors.textDim} -mt-2`}>
        You'll always see the real number and who's attending. You can add up to 5 photos from the event page right after creating it.
      </p>

      <Field label="Questions for people who RSVP" hint="(optional)">
        <QuestionBuilder value={questions} onChange={setQuestions} hint="For example dietary needs or what they want to learn. Answers appear on your event dashboard." />
      </Field>

      {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
      <SubmitButton busy={busy} />
    </form>
  );
}
