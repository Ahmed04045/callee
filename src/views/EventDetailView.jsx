// src/views/EventDetailView.jsx

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { supabase } from '../lib/supabaseClient';
import Icon from '../components/Icon';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function EventDetailView() {
  const { colors, radius } = themeConfig;
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading');

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

        <div className={`mt-5 pt-4 border-t ${colors.border} space-y-2 text-sm ${colors.textMuted}`}>
          <div className="flex items-center gap-2">
            <Icon name="calendar_today" size={16} className={colors.textFaint} />
            {formatDate(event.event_date)}
          </div>
          <div className="flex items-center gap-2">
            <Icon name="location_on" size={16} className={colors.textFaint} />
            {event.location}
          </div>
          <div className="flex items-center gap-2">
            <Icon name="group" size={16} className={colors.textFaint} />
            {event.spots} spots left
          </div>
        </div>
      </div>
    </div>
  );
}