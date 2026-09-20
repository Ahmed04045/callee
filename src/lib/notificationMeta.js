// src/lib/notificationMeta.js
//
// How each notification type is drawn (pixel icon + colour token) and a small
// "time ago" formatter. Types are created by the triggers in 011_notifications.sql.

export const NOTIFICATION_META = {
  join_request: { icon: 'how_to_reg', tone: 'accent' },
  join_approved: { icon: 'check_circle', tone: 'success' },
  join_declined: { icon: 'cancel', tone: 'error' },
  group_approved: { icon: 'groups', tone: 'success' },
  group_rejected: { icon: 'groups', tone: 'error' },
  submission_approved: { icon: 'check_circle', tone: 'success' },
  submission_rejected: { icon: 'cancel', tone: 'error' },
  rsvp: { icon: 'event_available', tone: 'accent' },
  application: { icon: 'work', tone: 'secondary' },
  mod_assigned: { icon: 'shield_person', tone: 'accent' },
  removed: { icon: 'cancel', tone: 'error' },
  application_update: { icon: 'work', tone: 'accent' },
  report: { icon: 'gpp_maybe', tone: 'warning' },
};

export const metaFor = (type) => NOTIFICATION_META[type] ?? { icon: 'notifications', tone: 'accent' };

export function timeAgo(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
