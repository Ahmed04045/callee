// src/views/create/GroupForm.jsx
//
// Create a private club/group. It is submitted through the create_group()
// database function, lands as "pending", and once an admin approves it the
// creator becomes its moderator. The WhatsApp / Discord links are stored
// private: they are only ever shown to approved members, that group's
// moderators and admins (see get_club_links()).

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../components/TelemetryLog';
import { CLUB_UNIVERSITIES } from '../../lib/education';
import { DISCORD_LINK, GROUP_CATEGORIES, WEEKDAYS, WHATSAPP_LINK } from '../../lib/options';
import { ChipPicker, Field, SubmitButton, useFormStyles } from './formKit';
import PlacePicker from './PlacePicker';
import { QuestionBuilder } from '../../components/Questions';
import { cleanForSave } from '../../lib/questions';

const DESCRIPTION_MIN = 50;
const TIMES = Array.from({ length: 30 }, (_, i) => {
  const minutes = 7 * 60 + i * 30; // 7:00 AM to 9:30 PM
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
});

const ERRORS = {
  DESCRIPTION_TOO_SHORT: `Description needs at least ${DESCRIPTION_MIN} characters.`,
  TOO_MANY_PENDING: 'You already have 3 groups waiting for approval.',
  LINK_REQUIRED: 'Add at least a WhatsApp or a Discord link.',
  BAD_WHATSAPP_LINK: 'That is not a WhatsApp group invite link.',
  BAD_DISCORD_LINK: 'That is not a Discord invite link.',
  BAD_NAME: 'Group name must be 3–60 characters.',
};

export default function GroupForm({ profile }) {
  const { colors } = themeConfig;
  const { input } = useFormStyles();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [university, setUniversity] = useState(CLUB_UNIVERSITIES.includes(profile?.university) ? profile.university : '');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState([]);
  const [time, setTime] = useState('');
  const [place, setPlace] = useState(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [discord, setDiscord] = useState('');
  const [questions, setQuestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!university) return setError('Choose the university this group belongs to.');
    if (!category) return setError('Choose a category.');
    if (description.trim().length < DESCRIPTION_MIN) return setError(ERRORS.DESCRIPTION_TOO_SHORT);
    if (!whatsapp.trim() && !discord.trim()) return setError(ERRORS.LINK_REQUIRED);
    if (whatsapp.trim() && !WHATSAPP_LINK.test(whatsapp.trim())) return setError(ERRORS.BAD_WHATSAPP_LINK + ' It should start with https://chat.whatsapp.com/');
    if (discord.trim() && !DISCORD_LINK.test(discord.trim())) return setError(ERRORS.BAD_DISCORD_LINK + ' It should start with https://discord.gg/');

    const schedule = days.length ? `${WEEKDAYS.filter((d) => days.includes(d)).join(', ')}${time ? `, ${time}` : ''}` : null;

    setBusy(true);
    logUserAction('CREATE_POST_SUBMIT', { kind: 'group' });
    const { data: newId, error: rpcError } = await supabase.rpc('create_group', {
      p_name: name,
      p_description: description,
      p_category: category,
      p_university: university,
      p_whatsapp_link: whatsapp.trim(),
      p_discord_link: discord.trim(),
      p_meeting_schedule: schedule,
      p_location: place?.name ?? null,
      p_place_id: place?.placeId ?? null,
      p_lat: place?.lat ?? null,
      p_lng: place?.lng ?? null,
    });
    const cleaned = cleanForSave(questions);
    if (!rpcError && newId && cleaned.length) {
      await supabase.rpc('set_join_questions', { p_club_id: newId, p_questions: cleaned });
    }
    setBusy(false);
    if (rpcError) {
      const key = Object.keys(ERRORS).find((k) => rpcError.message.includes(k));
      return setError(key ? ERRORS[key] : rpcError.message);
    }
    navigate('/my-submissions');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Group name">
        <input className={input} required minLength={3} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="University">
          <select className={input} required value={university} onChange={(e) => setUniversity(e.target.value)}>
            <option value="" disabled>Select…</option>
            {CLUB_UNIVERSITIES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select className={input} required value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="" disabled>Select…</option>
            {GROUP_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Description"
        hint="(50+ characters)"
        right={<span className={`text-[10px] ${description.trim().length < DESCRIPTION_MIN ? colors.error : colors.success}`}>{description.trim().length}/{DESCRIPTION_MIN}</span>}
      >
        <textarea className={`${input} resize-none`} required rows={4} maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <Field label="Meeting days" hint="(optional)">
        <ChipPicker multiple options={WEEKDAYS} value={days} onChange={setDays} />
        {days.length > 0 && (
          <select className={input} value={time} onChange={(e) => setTime(e.target.value)}>
            <option value="">Time (optional)</option>
            {TIMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Meeting place" hint="(optional)">
        <PlacePicker value={place} onChange={setPlace} />
      </Field>

      <div className={`p-3 ${colors.bgInset} rounded-xl border ${colors.border} space-y-3`}>
        <p className={`text-[11px] ${colors.textMuted} leading-relaxed`}>
          Groups are private. These links are never shown publicly — only approved members, this group's moderators and admins can see them.
          Add at least one.
        </p>
        <Field label="WhatsApp group invite link">
          <input className={input} inputMode="url" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="https://chat.whatsapp.com/…" />
        </Field>
        <Field label="Discord invite link">
          <input className={input} inputMode="url" value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="https://discord.gg/…" />
        </Field>
      </div>

      <Field label="Questions for people who want to join" hint="(optional)">
        <QuestionBuilder value={questions} onChange={setQuestions} hint="Moderators see the answers next to each join request." />
      </Field>

      {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
      <SubmitButton busy={busy}>Submit group for review</SubmitButton>
    </form>
  );
}
