// src/components/CreatePostModal.jsx
//
// Two post types, one modal: Gig/Opportunity (existing `gigs` table —
// `kind` and framing change based on account_type, personal -> 
// "opportunity", business -> "gig") and Event (the `events` table, with
// its own required fields: type, contact method, 50+ char description,
// and capacity). Both always submit as status='pending' — RLS
// (004/006 migrations) forces that server-side regardless of what this
// form sends, so there's no client-side way to bypass moderation even if
// this component had a bug.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from './TelemetryLog';
import Icon from './Icon';

const EVENT_TYPES = [
  'Hackathon',
  'Workshop',
  'Meetup',
  'Conference',
  'Networking',
  'Competition',
  'Social',
  'Other',
];

const CONTACT_METHODS = [
  { id: 'phone', label: 'Phone number', placeholder: '+974 5555 5555' },
  { id: 'whatsapp', label: 'WhatsApp number', placeholder: '+974 5555 5555' },
  { id: 'instagram', label: 'Instagram handle', placeholder: '@yourhandle' },
  { id: 'telegram', label: 'Telegram handle', placeholder: '@yourhandle' },
  { id: 'discord', label: 'Discord handle', placeholder: 'username' },
];

const DESCRIPTION_MIN = 50;

const inputClass = (colors, radius) =>
  `w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`;

export default function CreatePostModal({ isOpen, onClose }) {
  const { colors, radius, spacing, font } = themeConfig;
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const [postType, setPostType] = useState('gig'); // 'gig' | 'event'
  const isPersonal = profile?.account_type === 'personal';
  const gigKind = isPersonal ? 'opportunity' : 'gig';

  // --- Gig / Opportunity fields ---
  const [role, setRole] = useState('');
  const [compensation, setCompensation] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [details, setDetails] = useState('');

  // --- Event fields ---
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [contactMethod, setContactMethod] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [capacityHidden, setCapacityHidden] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setRole('');
    setCompensation('');
    setTagsInput('');
    setDetails('');
    setEventName('');
    setEventType('');
    setEventDate('');
    setEventLocation('');
    setContactMethod('');
    setContactValue('');
    setEventDescription('');
    setCapacity('');
    setCapacityHidden(false);
    setError(null);
    setPostType('gig');
    onClose();
  };

  const postedBy = profile?.display_name?.trim() || user.email;

  const handleSubmitGig = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    logUserAction('CREATE_POST_SUBMIT', { kind: gigKind });

    const { data, error: insertError } = await supabase
      .from('gigs')
      .insert({
        role: role.trim(),
        posted_by: postedBy,
        posted_by_user_id: user.id,
        compensation: compensation.trim() || 'Unpaid',
        tags,
        details: details.trim(),
        kind: gigKind,
        status: 'pending',
      })
      .select()
      .single();

    setIsSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    resetAndClose();
    navigate(`/gigs/${data.id}`);
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    setError(null);

    if (eventDescription.trim().length < DESCRIPTION_MIN) {
      setError(`Description needs at least ${DESCRIPTION_MIN} characters.`);
      return;
    }
    if (!contactMethod || !contactValue.trim()) {
      setError('Pick a contact method and fill it in.');
      return;
    }
    const capacityNumber = Number(capacity);
    if (!capacityNumber || capacityNumber <= 0) {
      setError('Capacity is required and must be a positive number.');
      return;
    }

    setIsSubmitting(true);
    logUserAction('CREATE_POST_SUBMIT', { kind: 'event' });

    const { data, error: insertError } = await supabase
      .from('events')
      .insert({
        title: eventName.trim(),
        organizer: postedBy,
        posted_by_user_id: user.id,
        event_date: eventDate,
        location: eventLocation.trim(),
        tag: eventType,
        event_type: eventType,
        description: eventDescription.trim(),
        contact_method: contactMethod,
        contact_value: contactValue.trim(),
        capacity: capacityNumber,
        capacity_hidden: capacityHidden,
        spots: capacityNumber, // no RSVPs yet — kept in sync by a DB trigger from here on
        status: 'pending',
      })
      .select()
      .single();

    setIsSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    resetAndClose();
    navigate(`/events/${data.id}`);
  };

  const selectedContactMethod = CONTACT_METHODS.find((m) => m.id === contactMethod);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center ${colors.scrim} backdrop-blur-sm px-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
    >
      <div
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} ${spacing.card} relative shadow-xl`}
      >
        <button
          onClick={resetAndClose}
          aria-label="Close"
          className={`absolute top-4 right-4 ${colors.textFaint} ${colors.textHoverStrong} transition`}
        >
          <Icon name="close" size={18} />
        </button>

        <h2 id="create-post-title" className={`text-lg ${font.heading} ${colors.textWhite} mb-1`}>
          Create
        </h2>
        <p className={`text-xs ${colors.textFaint} mb-4`}>
          Submitted for review — it won't be public until approved.
        </p>

        <div className="flex gap-2 mb-5">
          {[
            { id: 'gig', label: isPersonal ? 'Opportunity' : 'Gig' },
            { id: 'event', label: 'Event' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPostType(tab.id)}
              className={`text-xs font-bold px-3.5 py-1.5 ${radius.full} border transition ${
                postType === tab.id
                  ? `${colors.accentBg} ${colors.accentOn} border-transparent`
                  : `${colors.textFaint} ${colors.borderStrong} ${colors.textHoverStrong}`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {postType === 'gig' ? (
          <form onSubmit={handleSubmitGig} className="space-y-3">
            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
                {isPersonal ? 'What are you offering?' : 'Role / title'}
              </span>
              <input
                type="text"
                required
                maxLength={100}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={inputClass(colors, radius)}
              />
            </label>

            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
                Compensation <span className={colors.textDim}>(optional)</span>
              </span>
              <input
                type="text"
                maxLength={60}
                value={compensation}
                onChange={(e) => setCompensation(e.target.value)}
                placeholder="e.g. Paid, Unpaid, Equity"
                className={inputClass(colors, radius)}
              />
            </label>

            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
                Tags <span className={colors.textDim}>(comma-separated)</span>
              </span>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Tech, Design, Media"
                className={inputClass(colors, radius)}
              />
            </label>

            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Details</span>
              <textarea
                required
                rows={4}
                maxLength={500}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className={`${inputClass(colors, radius)} resize-none`}
              />
            </label>

            {error && <p className={`text-xs ${colors.error}`}>{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 ${radius.full} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-60`}
            >
              {isSubmitting && (
                <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />
              )}
              Submit for review
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitEvent} className="space-y-3">
            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Event name</span>
              <input
                type="text"
                required
                maxLength={100}
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className={inputClass(colors, radius)}
              />
            </label>

            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Event type</span>
              <select
                required
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className={inputClass(colors, radius)}
              >
                <option value="" disabled>
                  Select…
                </option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Date</span>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={inputClass(colors, radius)}
              />
            </label>

            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Location</span>
              <input
                type="text"
                required
                maxLength={150}
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className={inputClass(colors, radius)}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-left">
                <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Contact via</span>
                <select
                  required
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className={inputClass(colors, radius)}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {CONTACT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-left">
                <span className={`text-[11px] font-semibold ${colors.textFaint}`}>&nbsp;</span>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder={selectedContactMethod?.placeholder ?? ''}
                  className={inputClass(colors, radius)}
                />
              </label>
            </div>

            <label className="block text-left">
              <div className="flex items-baseline justify-between">
                <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
                  Description <span className={colors.textDim}>(50+ characters)</span>
                </span>
                <span
                  className={`text-[10px] ${
                    eventDescription.trim().length < DESCRIPTION_MIN ? colors.error : colors.success
                  }`}
                >
                  {eventDescription.trim().length}/{DESCRIPTION_MIN}
                </span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={800}
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className={`${inputClass(colors, radius)} resize-none`}
              />
            </label>

            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
                Capacity <span className={colors.textDim}>(required — can be hidden below)</span>
              </span>
              <input
                type="number"
                required
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={inputClass(colors, radius)}
              />
            </label>

            <label
              className={`flex items-center justify-between p-3 ${colors.bgInset} ${radius.md} border ${colors.border}`}
            >
              <span className={`text-xs ${colors.textMuted}`}>Hide seat count from public listing</span>
              <input
                type="checkbox"
                checked={capacityHidden}
                onChange={(e) => setCapacityHidden(e.target.checked)}
                className="accent-md3-primary"
              />
            </label>
            <p className={`text-[10px] ${colors.textDim} -mt-2`}>
              You'll always see the real number and who's attending, regardless of this setting.
            </p>

            {error && <p className={`text-xs ${colors.error}`}>{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 ${radius.full} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-60`}
            >
              {isSubmitting && (
                <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />
              )}
              Submit for review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}