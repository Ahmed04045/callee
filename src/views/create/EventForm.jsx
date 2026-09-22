// src/views/create/EventForm.jsx
//
// Event: type is chosen, date/time use pickers (no past dates), location
// comes from Google Places (which also gives Discover its map pin), contact
// details are validated per method. Lands as pending.
//
// Photos are picked here but only uploaded after the event row exists (the
// 'event-photos' Storage policy requires a real, owned event id — see
// 007_photos_and_avatars.sql) — the same reason EventDetailView's own photo
// uploader waits until an event has an id. Nothing is uploaded if the form
// is cancelled, so there is nothing to clean up: the files just sit as
// local previews until the event is actually created.

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../components/TelemetryLog';
import { uploadImage, fileExtension, validateImageFile } from '../../lib/imageUpload';
import { CONTACT_METHODS, EVENT_TYPES, validateContact } from '../../lib/options';
import { Field, SubmitButton, todayISO, useFormStyles } from './formKit';
import PlacePicker from './PlacePicker';
import { QuestionBuilder } from '../../components/Questions';
import { cleanForSave } from '../../lib/questions';
import Icon from '../../components/Icon';
import { useT } from '../../i18n';

const DESCRIPTION_MIN = 50;
const MAX_PHOTOS = 5;

export default function EventForm({ user, postedBy, onDone }) {
  const { t } = useT();
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
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [photos, setPhotos] = useState([]); // [{ file, previewUrl }]
  const [questions, setQuestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const addPhotos = (fileList) => {
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(fileList).slice(0, room);
    const problems = picked.map(validateImageFile).filter(Boolean);
    if (problems[0]) return setError(problems[0]);
    setPhotos((prev) => [...prev, ...picked.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  };
  const removePhoto = (index) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };
  // Revokes whatever preview URLs exist when the form is closed without submitting
  // (cancelling the Create modal unmounts this) — nothing was ever uploaded, this
  // just frees the local object URLs.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const method = CONTACT_METHODS.find((m) => m.id === contactMethod);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!type) return setError(t('Choose an event type.'));
    if (!date || date < todayISO()) return setError(t('Pick a date that is today or later.'));
    if (!place) return setError(t('Choose the location from the search suggestions.'));
    const contact = validateContact(contactMethod, contactValue);
    if (!contact.ok) return setError(contact.error);
    if (description.trim().length < DESCRIPTION_MIN) return setError(`Description needs at least ${DESCRIPTION_MIN} characters.`);
    const seats = Number(capacity);
    if (!Number.isInteger(seats) || seats <= 0 || seats > 100000) return setError(t('Capacity must be a whole number above 0.'));

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
        is_free: isFree,
        price: isFree ? null : price.trim() || null,
        questions: cleanForSave(questions).length ? cleanForSave(questions) : null,
        spots: seats, // no RSVPs yet — kept in sync by a DB trigger from here on
        status: 'pending',
      })
      .select()
      .single();
    if (insertError) {
      setBusy(false);
      return setError(insertError.message);
    }

    for (let i = 0; i < photos.length; i++) {
      const path = `${data.id}/${Date.now()}-${i}.${fileExtension(photos[i].file)}`;
      const { url } = await uploadImage('event-photos', path, photos[i].file);
      if (url) await supabase.from('event_photos').insert({ event_id: data.id, url, position: i });
    }

    setBusy(false);
    onDone?.();
    navigate(`/events/${data.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('Event name')}>
        <input className={input} required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field label={t('Event type')}>
        <select className={input} required value={type} onChange={(e) => setType(e.target.value)}>
          <option value="" disabled>{t('Select…')}</option>
          {EVENT_TYPES.map((opt) => (
            <option key={opt} value={opt}>{t(opt)}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label={t('Date')}>
          <input type="date" className={input} required min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('Start time')} hint={t('(optional)')}>
          <input type="time" className={input} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>

      <Field label={t('Location')}>
        <PlacePicker value={place} onChange={setPlace} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label={t('Contact via')}>
          <select className={input} required value={contactMethod} onChange={(e) => { setContactMethod(e.target.value); setContactValue(''); }}>
            <option value="" disabled>{t('Select…')}</option>
            {CONTACT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>{t(m.label)}</option>
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
            placeholder={method?.placeholder ?? t('Pick a method first')}
            inputMode={method?.kind === 'phone' ? 'tel' : 'text'}
          />
        </Field>
      </div>

      <Field
        label={t('Description')}
        hint={t('(50+ characters)')}
        right={<span className={`text-[10px] ${description.trim().length < DESCRIPTION_MIN ? colors.error : colors.success}`}>{description.trim().length}/{DESCRIPTION_MIN}</span>}
      >
        <textarea className={`${input} resize-none`} required rows={4} maxLength={800} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <Field label={t('Capacity')} hint={t('(required — can be hidden below)')}>
        <input type="number" inputMode="numeric" className={input} required min={1} step={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </Field>

      <label className={`flex items-center justify-between p-3 ${colors.bgInset} rounded-xl border ${colors.border}`}>
        <span className={`text-xs ${colors.textMuted}`}>{t('Hide seat count from public listing')}</span>
        <input type="checkbox" checked={capacityHidden} onChange={(e) => setCapacityHidden(e.target.checked)} className="accent-md3-primary" />
      </label>
      <p className={`text-[10px] ${colors.textDim} -mt-2`}>
        {t('You\'ll always see the real number and who\'s attending.')}
      </p>

      <Field label={t('Is there a cost to attend?')}>
        <div className="flex gap-2">
          <label className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl border transition ${isFree ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong}`}`}>
            <input type="radio" className="hidden" checked={isFree} onChange={() => setIsFree(true)} /> {t('Free entry')}
          </label>
          <label className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl border transition ${!isFree ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong}`}`}>
            <input type="radio" className="hidden" checked={!isFree} onChange={() => setIsFree(false)} /> {t('There\'s a cost')}
          </label>
        </div>
        {!isFree && (
          <input className={`${input} mt-2`} maxLength={40} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('e.g. 50 QAR, or "Bring your own materials"')} />
        )}
      </Field>

      <Field label={t('Photos')} hint={t('(optional, up to {n})', { n: MAX_PHOTOS })}>
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.previewUrl} className="relative w-16 h-16 shrink-0">
              <img src={p.previewUrl} alt="" className="w-full h-full object-cover rounded-lg" />
              <button type="button" onClick={() => removePhoto(i)} aria-label={t('Remove photo')} className="absolute -top-1.5 -end-1.5 bg-black/80 rounded-full p-0.5">
                <Icon name="close" size={12} className="text-white" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className={`w-16 h-16 shrink-0 flex items-center justify-center rounded-lg border border-dashed ${colors.borderStrong} ${colors.textFaint} cursor-pointer`}>
              <Icon name="add_photo_alternate" size={20} />
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
            </label>
          )}
        </div>
      </Field>

      <Field label={t('Questions for people who RSVP')} hint={t('(optional)')}>
        <QuestionBuilder value={questions} onChange={setQuestions} hint={t('For example dietary needs or what they want to learn. Answers appear on your event dashboard.')} />
      </Field>

      {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
      <SubmitButton busy={busy} />
    </form>
  );
}
