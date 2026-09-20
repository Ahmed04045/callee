// src/views/admin/AdminEvents.jsx
//
// Events could be created by any signed-in user (006) but the old admin page
// only moderated gigs, so submitted events had no way to be approved.

import React from 'react';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import { logUserAction } from '../../components/TelemetryLog';
import ModerationQueue from '../../components/ModerationQueue';
import { useT } from '../../i18n';

export default function AdminEvents() {
  const { t } = useT();
  const { colors } = themeConfig;

  const setStatus = async (event, next) => {
    logUserAction('ADMIN_EVENT_STATUS_CHANGE', { eventId: event.id, from: event.status, to: next });
    const { error } = await supabase.from('events').update({ status: next }).eq('id', event.id);
    return error?.message ?? null;
  };

  return (
    <ModerationQueue
      title={t('Event moderation')}
      subtitle={t('Events stay off Home and the Discover map until approved.')}
      table="events"
      orderBy="created_at"
      onSetStatus={setStatus}
      renderItem={(event) => (
        <>
          <h3 className={`text-sm font-bold ${colors.textWhite}`}>{event.title}</h3>
          <p className={`text-xs ${colors.textFaint} mt-0.5`}>
            {event.organizer} · {event.event_type || event.tag} · {event.event_date}
            {event.start_time ? ` ${String(event.start_time).slice(0, 5)}` : ''}
          </p>
          <p className={`text-xs ${colors.textFaint} mt-0.5`}>
            {event.location} · capacity {event.capacity ?? '—'} · contact: {event.contact_method} {event.contact_value}
          </p>
          <p className={`text-xs ${colors.textMuted} mt-3 leading-relaxed`}>{event.description}</p>
        </>
      )}
    />
  );
}
