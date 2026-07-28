// src/views/EventDetailView.jsx

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';

const CONTACT_LABELS = {
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  discord: 'Discord',
};

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function EventDetailView() {
  const { colors, radius } = themeConfig;
  const { id } = useParams();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading');
  const [isAttending, setIsAttending] = useState(false);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [attendeesStatus, setAttendeesStatus] = useState('idle');

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

  // Am I already RSVP'd?
  useEffect(() => {
    if (!event || !user) {
      setIsAttending(false);
      return;
    }
    let isMounted = true;
    supabase
      .from('event_attendees')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (isMounted) setIsAttending(Boolean(data));
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

  const handleToggleRsvp = async () => {
    if (!user || !event) return;
    setIsRsvpLoading(true);
    logUserAction('EVENT_RSVP_TOGGLE', { eventId: event.id, attending: !isAttending });

    if (isAttending) {
      await supabase.from('event_attendees').delete().eq('event_id', event.id).eq('user_id', user.id);
      setIsAttending(false);
    } else {
      await supabase.from('event_attendees').insert({ event_id: event.id, user_id: user.id });
      setIsAttending(true);
    }

    // events.spots is kept accurate by a DB trigger — refetch to reflect it.
    const { data } = await supabase.from('events').select('*').eq('id', event.id).maybeSingle();
    if (data) setEvent(data);
    setIsRsvpLoading(false);
  };

  if (status === 'loading') {
    return <p className={`text-sm ${colors.textFaint}`}>Loading…</p>;
  }

  if (status === 'notFound' || status === 'error') {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <Icon name="search_off" size={28} className={colors.textFaint} />
        <p className={`text-sm ${colors.textFaint}`}>
          {status === 'notFound' ? "This event doesn't exist." : "Couldn't load this event."}
        </p>
        <Link to="/" className={`text-xs font-semibold ${colors.accent}`}>
          Back to Feed
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
        <Icon name="arrow_back" size={14} /> Back to Feed
      </Link>

      <div className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-6`}>
        <span
          className={`text-[10px] ${colors.accentSoftBg} ${colors.accent} border ${colors.accentBorder} px-2.5 py-0.5 ${radius.full}`}
        >
          {event.tag}
        </span>
        <h1 className={`text-xl font-bold ${colors.textWhite} mt-3`}>{event.title}</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <p className={`text-xs ${colors.textMuted}`}>By {event.organizer}</p>
          {event.organizer_verified && (
            <span className={`flex items-center gap-1 text-[10px] ${colors.success}`}>
              <Icon name="verified" size={12} /> Verified
            </span>
          )}
        </div>

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
          {showSpots && (
            <div className="flex items-center gap-2">
              <Icon name="group" size={16} className={colors.textFaint} />
              {event.spots} spots left
              {isOrganizer && event.capacity_hidden && (
                <span className={`text-[10px] ${colors.textDim}`}>(hidden from public)</span>
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

        <div className={`mt-6 pt-4 border-t ${colors.border}`}>
          {!user ? (
            <p className={`text-xs ${colors.textFaint}`}>Sign in to RSVP.</p>
          ) : isOrganizer ? (
            <p className={`text-xs ${colors.textFaint}`}>This is your event.</p>
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
                  You're Attending <Icon name="check_circle" size={13} className="text-inherit" />
                </>
              ) : (
                <>
                  I'm Attending <Icon name="event_available" size={13} className="text-inherit" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {isOrganizer && (
        <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-6 space-y-4`}>
          <h2 className={`text-sm font-bold ${colors.textWhite} flex items-center gap-2`}>
            <Icon name="groups" size={16} /> Attendees ({attendees.length})
          </h2>

          {attendeesStatus === 'loading' && (
            <p className={`text-xs ${colors.textFaint}`}>Loading…</p>
          )}
          {attendeesStatus === 'ready' && attendees.length === 0 && (
            <p className={`text-xs ${colors.textFaint}`}>Nobody's RSVP'd yet.</p>
          )}

          <div className="space-y-2">
            {attendees.map((a) => (
              <div
                key={a.user_id}
                className={`${colors.bgCard} border ${colors.border} ${radius.md} p-3 flex items-center gap-3`}
              >
                <div
                  className={`w-9 h-9 ${colors.gradientBrand} ${radius.full} flex items-center justify-center text-xs font-bold ${colors.accentOn} shrink-0`}
                >
                  {(a.profile?.display_name || '?')[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${colors.textWhite} truncate`}>
                    {a.profile?.display_name || 'Unnamed'}
                  </p>
                  <p className={`text-[11px] ${colors.textFaint} truncate`}>
                    {a.profile?.university || 'No school listed'}
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