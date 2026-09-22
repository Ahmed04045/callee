// src/views/EventDetailView.jsx

import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from '../components/TelemetryLog';
import { uploadImage, fileExtension, deleteImage, storagePathFromPublicUrl } from '../lib/imageUpload';
import Icon from '../components/Icon';
import LocationMap from '../components/LocationMap';
import StickyAction from '../components/StickyAction';
import TicketCard from '../components/TicketCard';
import { ReportButton, SaveButton } from '../components/SaveReportButtons';
import { useProfile } from '../context/ProfileContext';
import AnswerModal from '../components/AnswerModal';
import { hasQuestions } from '../lib/questions';
import { PixelAvatar, PixelCover } from '../components/Pixel';
import { DateBadge } from '../components/FeedCards';
import { useT, formatDate as formatLocalDate } from '../i18n';

const CONTACT_LABELS = {
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  discord: 'Discord',
};

const MAX_PHOTOS = 5;

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return formatLocalDate(date, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function EventDetailView({ onOpenAuthModal }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { id } = useParams();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [myTicket, setMyTicket] = useState(null);
  const [askOpen, setAskOpen] = useState(false);

  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading');
  const [isAttending, setIsAttending] = useState(false);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [attendeesStatus, setAttendeesStatus] = useState('idle');

  const [photos, setPhotos] = useState([]);
  const [photosStatus, setPhotosStatus] = useState('idle');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const photoInputRef = useRef(null);

  const isOrganizer = Boolean(event && user && event.posted_by_user_id === user.id);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setStatus('loading');
      const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
      if (!isMounted) return;
      if (error) {
        setStatus('error');
        return;
      }
      if (!data) {
        setStatus('notFound');
        return;
      }
      setEvent(data);
      setStatus('ready');
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Photos — public for approved events, organizer can see their own
  // regardless of status (same RLS pattern as everything else here).
  useEffect(() => {
    if (!event) return;
    let isMounted = true;
    async function loadPhotos() {
      setPhotosStatus('loading');
      const { data, error } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', event.id)
        .order('position', { ascending: true });
      if (!isMounted) return;
      if (error) {
        setPhotosStatus('error');
        return;
      }
      setPhotos(data ?? []);
      setPhotosStatus('ready');
    }
    loadPhotos();
    return () => {
      isMounted = false;
    };
  }, [event]);

  // Am I already RSVP'd?
  useEffect(() => {
    if (!event || !user) {
      setIsAttending(false);
      setMyTicket(null);
      return;
    }
    let isMounted = true;
    supabase
      .from('event_attendees')
      .select('id, ticket_code, checked_in_at')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!isMounted) return;
        setIsAttending(Boolean(data));
        setMyTicket(data?.ticket_code ? data : null);
      });
    return () => {
      isMounted = false;
    };
  }, [event, user]);

  // Organizer-only: who's attending, with their profile info. Two
  // separate queries rather than a PostgREST embed — event_attendees and
  // profiles both reference auth.users independently, not each other, so
  // there's no direct foreign key for PostgREST to embed through.
  // Deliberately NOT selecting date_of_birth here even though RLS would
  // allow it — see the note in 006_event_creation_and_attendees.sql.
  useEffect(() => {
    if (!isOrganizer) return;
    let isMounted = true;
    async function loadAttendees() {
      setAttendeesStatus('loading');
      const { data: rsvps, error: rsvpError } = await supabase
        .from('event_attendees')
        .select('user_id, created_at')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });

      if (!isMounted) return;
      if (rsvpError) {
        setAttendeesStatus('error');
        return;
      }
      if (rsvps.length === 0) {
        setAttendees([]);
        setAttendeesStatus('ready');
        return;
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, university, bio')
        .in(
          'user_id',
          rsvps.map((r) => r.user_id)
        );

      if (!isMounted) return;
      setAttendees(
        rsvps.map((r) => ({ ...r, profile: profilesData?.find((p) => p.user_id === r.user_id) ?? null }))
      );
      setAttendeesStatus('ready');
    }
    loadAttendees();
    return () => {
      isMounted = false;
    };
  }, [isOrganizer, event]);

  // Save the RSVP (with answers when the event asks questions). Returns an error sentence or null.
  const saveRsvp = async (answers = {}) => {
    const { error } = await supabase.from('event_attendees').insert({ event_id: event.id, user_id: user.id, answers });
    if (error) {
      if (/ANSWER_REQUIRED/.test(error.message)) return 'Please answer all the required questions.';
      if (/ANSWER_/.test(error.message)) return 'One of your answers is not valid.';
      return error.message;
    }
    setIsAttending(true);
    const { data } = await supabase.from('events').select('*').eq('id', event.id).maybeSingle();
    if (data) setEvent(data);
    return null;
  };

  const handleToggleRsvp = async () => {
    if (!user || !event) return;
    // Joining an event that asks questions: ask them first.
    if (!isAttending && hasQuestions(event.questions)) {
      setAskOpen(true);
      return;
    }
    setIsRsvpLoading(true);
    logUserAction('EVENT_RSVP_TOGGLE', { eventId: event.id, attending: !isAttending });

    if (isAttending) {
      await supabase.from('event_attendees').delete().eq('event_id', event.id).eq('user_id', user.id);
      setIsAttending(false);
    } else {
      await saveRsvp();
    }

    // events.spots is kept accurate by a DB trigger — refetch to reflect it.
    const { data } = await supabase.from('events').select('*').eq('id', event.id).maybeSingle();
    if (data) setEvent(data);
    setIsRsvpLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !event) return;
    if (photos.length >= MAX_PHOTOS) {
      setPhotoError(`Maximum of ${MAX_PHOTOS} photos.`);
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError(null);
    logUserAction('EVENT_PHOTO_UPLOAD', { eventId: event.id });

    const path = `${event.id}/${Date.now()}.${fileExtension(file)}`;
    const { url, error: uploadError } = await uploadImage('event-photos', path, file);

    if (uploadError) {
      setPhotoError(uploadError);
      setIsUploadingPhoto(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('event_photos')
      .insert({ event_id: event.id, url, position: photos.length })
      .select()
      .single();

    setIsUploadingPhoto(false);
    if (insertError) {
      setPhotoError(insertError.message);
      return;
    }
    setPhotos((prev) => [...prev, data]);
  };

  const handlePhotoDelete = async (photo) => {
    await supabase.from('event_photos').delete().eq('id', photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    // The DB row is what controls visibility, so it comes off first — the
    // Storage file underneath it is removed right after, best-effort, so a
    // deleted photo doesn't just sit there taking up space indefinitely.
    const path = storagePathFromPublicUrl(photo.url, 'event-photos');
    if (path) deleteImage('event-photos', path);
  };

  if (status === 'loading') {
    return <p className={`text-sm ${colors.textFaint}`}>{t('Loading…')}</p>;
  }

  if (status === 'notFound' || status === 'error') {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <Icon name="search_off" size={28} className={colors.textFaint} />
        <p className={`text-sm ${colors.textFaint}`}>
          {status === 'notFound' ? t('This event doesn\'t exist.') : t('Couldn\'t load this event.')}
        </p>
        <Link to="/" className={`text-xs font-semibold ${colors.accent}`}>
          {t('Back to Home')}
        </Link>
      </div>
    );
  }

  const showSpots = !event.capacity_hidden || isOrganizer;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Link
        to="/"
        className={`inline-flex items-center gap-1 text-xs font-semibold ${colors.textFaint} ${colors.textHoverAccent} transition`}
      >
        <Icon name="arrow_back" size={14} /> {t('Back to Home')}
      </Link>

      <div className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} overflow-hidden`}>
      <div className="relative h-32 md:h-40">
        {photosStatus === 'ready' && photos.length > 0 ? (
          <img src={photos[0].url} alt="" className="w-full h-full object-cover" />
        ) : (
          <PixelCover seed={event.id} cols={72} rows={14} />
        )}
        <div className="absolute start-5 bottom-[-22px]">
          <DateBadge date={event.event_date} />
        </div>
        {event.tag && (
          <span className={`absolute end-4 top-4 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 bg-md3-surface/85 ${colors.accent} border ${colors.accentBorder}`}>
            {event.tag}
          </span>
        )}
      </div>
      <div className="p-6 pt-9">
        <h1 className={`text-2xl font-bold ${colors.textWhite}`}>{event.title}</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <p className={`text-xs ${colors.textMuted}`}>{t('By {name}', { name: event.organizer })}</p>
          {event.organizer_verified && (
            <span className={`flex items-center gap-1 text-[10px] ${colors.success}`}>
              <Icon name="verified" size={12} /> {t('Verified')}
            </span>
          )}
        </div>

        {photosStatus === 'ready' && photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {photos.map((photo) => (
              <img
                key={photo.id}
                src={photo.url}
                alt=""
                className={`w-full aspect-square object-cover ${radius.md} border ${colors.border}`}
              />
            ))}
          </div>
        )}

        {event.description && (
          <p className={`text-sm ${colors.textMuted} mt-4 leading-relaxed`}>{event.description}</p>
        )}

        <div className={`mt-5 pt-4 border-t ${colors.border} space-y-2 text-sm ${colors.textMuted}`}>
          <div className="flex items-center gap-2">
            <Icon name="calendar_today" size={16} className={colors.textFaint} />
            {formatDate(event.event_date)}
          </div>
          <div className="flex items-center gap-2">
            <Icon name="location_on" size={16} className={colors.textFaint} />
            {event.location}
          </div>
          <LocationMap name={event.location} lat={event.lat} lng={event.lng} placeId={event.place_id} />
          <div className="flex items-center gap-2">
            <Icon name="payments" size={16} className={colors.textFaint} />
            {event.is_free === false ? event.price || t('Paid entry') : t('Free entry')}
          </div>
          {showSpots && (
            <div className="flex items-center gap-2">
              <Icon name="group" size={16} className={colors.textFaint} />
              {event.capacity != null && event.capacity - event.spots > 0 ? `${t('{n} going', { n: event.capacity - event.spots })} · ` : ''}
              {t('{n} spots left', { n: event.spots })}
              {isOrganizer && event.capacity_hidden && (
                <span className={`text-[10px] ${colors.textDim}`}>{t('(hidden from public)')}</span>
              )}
            </div>
          )}
          {event.contact_method && event.contact_value && (
            <div className="flex items-center gap-2">
              <Icon name="chat" size={16} className={colors.textFaint} />
              {CONTACT_LABELS[event.contact_method] ?? event.contact_method}: {event.contact_value}
            </div>
          )}
        </div>

      </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SaveButton kind="event" itemId={event.id} onNeedAuth={() => onOpenAuthModal?.()} />
        {!isOrganizer && <ReportButton kind="event" itemId={event.id} onNeedAuth={() => onOpenAuthModal?.()} />}
        {isOrganizer && (
          <>
            <Link to={`/events/${event.id}/manage`} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 ${colors.accentBg} ${colors.accentOn} ${radius.full}`}>
              <Icon name="dashboard" size={14} className="text-inherit" /> {t('Manage & stats')}
            </Link>
            <Link to={`/events/${event.id}/scan`} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 border ${colors.borderStrong} ${colors.textWhite} ${radius.full}`}>
              <Icon name="search" size={14} className="text-inherit" /> {t('Scan tickets')}
            </Link>
          </>
        )}
      </div>

      {myTicket && !isOrganizer && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider`}>{t('Your ticket')}</h2>
            <button onClick={() => window.print()} className={`text-xs font-semibold ${colors.accent}`}>{t('Print')}</button>
          </div>
          <TicketCard event={event} ticket={myTicket} holderName={profile?.display_name || (profile?.username ? `@${profile.username}` : user.email)} />
        </section>
      )}

      <StickyAction summary={event.title} sub={`${formatDate(event.event_date)} · ${event.location}`}>
          {!user ? (
            <p className={`text-xs ${colors.textFaint}`}>{t('Sign in to RSVP.')}</p>
          ) : isOrganizer ? (
            <p className={`text-xs ${colors.textFaint}`}>{t('This is your event.')}</p>
          ) : (
            <button
              onClick={handleToggleRsvp}
              disabled={isRsvpLoading}
              className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider px-4 py-2 ${radius.full} transition ${
                isAttending
                  ? `${colors.success} ${colors.bgInset} border ${colors.borderStrong}`
                  : `${colors.accentBg} ${colors.accentOn} ${colors.accentBgHover}`
              } disabled:opacity-60`}
            >
              {isAttending ? (
                <>
                  {t('You\'re Attending')} <Icon name="check_circle" size={13} className="text-inherit" />
                </>
              ) : (
                <>
                  {t('I\'m Attending')} <Icon name="event_available" size={13} className="text-inherit" />
                </>
              )}
            </button>
          )}
      </StickyAction>

      {askOpen && (
        <AnswerModal
          title={t('RSVP: {title}', { title: event.title })}
          intro={t('The organizer has a few questions.')}
          questions={event.questions}
          submitLabel={t('Get my ticket')}
          shares={t('Your answers will be shared with the event organizer.')}
          onSubmit={(payload) => saveRsvp(payload.answers)}
          onClose={() => setAskOpen(false)}
        />
      )}

      {isOrganizer && (
        <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-6 space-y-4`}>
          <h2 className={`text-sm font-bold ${colors.textWhite} flex items-center gap-2`}>
            <Icon name="photo_library" size={16} /> {t('Photos')} ({photos.length}/{MAX_PHOTOS})
          </h2>

          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square">
                <img
                  src={photo.url}
                  alt=""
                  className={`w-full h-full object-cover ${radius.md} border ${colors.border}`}
                />
                <button
                  onClick={() => handlePhotoDelete(photo)}
                  aria-label={t('Remove photo')}
                  className={`absolute top-1 end-1 p-1 ${colors.scrim} ${radius.full} opacity-0 group-hover:opacity-100 transition`}
                >
                  <Icon name="close" size={14} className="text-white" />
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className={`aspect-square flex items-center justify-center ${colors.bgInset} border ${colors.borderStrong} border-dashed ${radius.md} ${colors.textFaint} ${colors.textHoverStrong} transition`}
              >
                {isUploadingPhoto ? (
                  <Icon name="progress_activity" size={20} className="animate-spin" />
                ) : (
                  <Icon name="add_photo_alternate" size={22} />
                )}
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          {photoError && <p className={`text-xs ${colors.error}`}>{photoError}</p>}
        </div>
      )}

      {isOrganizer && (
        <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-6 space-y-4`}>
          <h2 className={`text-sm font-bold ${colors.textWhite} flex items-center gap-2`}>
            <Icon name="groups" size={16} /> {t('Attendees')} ({attendees.length})
          </h2>

          {attendeesStatus === 'loading' && (
            <p className={`text-xs ${colors.textFaint}`}>{t('Loading…')}</p>
          )}
          {attendeesStatus === 'ready' && attendees.length === 0 && (
            <p className={`text-xs ${colors.textFaint}`}>{t('Nobody\'s RSVP\'d yet.')}</p>
          )}

          <div className="space-y-2">
            {attendees.map((a) => (
              <div
                key={a.user_id}
                className={`${colors.bgCard} border ${colors.border} ${radius.md} p-3 flex items-center gap-3`}
              >
                {a.profile?.avatar_url ? (
                  <img
                    src={a.profile.avatar_url}
                    alt=""
                    className="w-9 h-9 object-cover shrink-0"
                  />
                ) : (
                  <PixelAvatar seed={a.user_id} size={36} />
                )}
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${colors.textWhite} truncate`}>
                    {a.profile?.display_name || t('Unnamed')}
                  </p>
                  <p className={`text-[11px] ${colors.textFaint} truncate`}>
                    {a.profile?.university || t('No school listed')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}