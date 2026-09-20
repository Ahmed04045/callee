// src/lib/notificationMeta.js
//
// How each notification type is drawn (icon + colour token), how its text is
// rebuilt in the reader's language, the settings categories, and a small
// "time ago" formatter. Types are created by the triggers in
// 011_notifications.sql / 013_questions_prefs_reminders.sql.

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
  reminder: { icon: 'event_available', tone: 'warning' },
  report: { icon: 'gpp_maybe', tone: 'warning' },
};

export const metaFor = (type) => NOTIFICATION_META[type] ?? { icon: 'notifications', tone: 'accent' };

const STATUS_LABEL = { submitted: 'Applied', reviewing: 'In review', shortlisted: 'Shortlisted', accepted: 'Accepted', rejected: 'Not selected' };
const REASON_LABEL = { spam: 'Spam', scam: 'Scam or fake', inappropriate: 'Inappropriate', wrong_info: 'Wrong information', other: 'Something else' };

/**
 * Notification title/body in the reader's language. The triggers store English
 * text plus a `data` object (names, titles); the sentence is rebuilt from
 * type + data so it follows the language setting. Older rows without `data`
 * fall back to the stored English text.
 */
export function notificationText(n, t) {
  const d = n.data ?? {};
  const fallback = { title: n.title, body: n.body };
  const person = d.person ?? t('Someone');
  switch (n.type) {
    case 'join_request':
      return d.club ? { title: t('New join request'), body: t('{person} wants to join {club}', { person, club: d.club }) } : fallback;
    case 'join_approved':
      return { title: t("You're in!"), body: d.club ?? n.body };
    case 'join_declined':
      return { title: t('Join request declined'), body: d.club ?? n.body };
    case 'group_approved':
      return { title: t('Your group is live'), body: d.club ?? n.body };
    case 'group_rejected':
      return { title: t("Your group wasn't approved"), body: d.club ?? n.body };
    case 'submission_approved':
      return d.kind ? { title: t('Your {kind} was approved', { kind: t(d.kind) }), body: d.title } : fallback;
    case 'submission_rejected':
      return d.kind ? { title: t("Your {kind} wasn't approved", { kind: t(d.kind) }), body: d.title } : fallback;
    case 'rsvp':
      return d.title ? { title: t('New RSVP'), body: t('{person} is going to {title}', { person, title: d.title }) } : fallback;
    case 'application':
      return d.title ? { title: t('New application'), body: t('{person} applied to {title}', { person, title: d.title }) } : fallback;
    case 'mod_assigned':
      return { title: t("You're now a moderator"), body: d.club ?? n.body };
    case 'removed':
      return { title: t('Removed from a club'), body: d.club ?? n.body };
    case 'application_update':
      return d.status
        ? { title: t('Application update'), body: `${d.title ?? t('A gig')}: ${t(STATUS_LABEL[d.status] ?? d.status)}` }
        : fallback;
    case 'reminder':
      return { title: t('Happening tomorrow'), body: d.title ?? n.body };
    case 'report':
      return d.kind
        ? { title: t('New report'), body: t('{reason} on a {kind}', { reason: t(REASON_LABEL[d.reason] ?? d.reason), kind: t(d.kind) }) }
        : fallback;
    default:
      return fallback;
  }
}

/** Groups on the notification settings page: which notification types each switch controls. */
export const NOTIFICATION_CATEGORIES = [
  { id: 'requests', label: 'Join requests', hint: 'Someone asks to join your club or group, and the answers to your own requests.', types: ['join_request', 'join_approved', 'join_declined', 'removed'] },
  { id: 'activity', label: 'RSVPs and applications', hint: 'People going to your events or applying to your gigs.', types: ['rsvp', 'application'] },
  { id: 'applications', label: 'My application updates', hint: 'When a gig you applied to changes your status.', types: ['application_update'] },
  { id: 'submissions', label: 'Reviews of my posts', hint: 'When an admin approves or declines your gig, event or group.', types: ['submission_approved', 'submission_rejected', 'group_approved', 'group_rejected'] },
  { id: 'reminders', label: 'Event reminders', hint: 'A reminder the day before an event you are going to.', types: ['reminder'] },
  { id: 'roles', label: 'Moderator changes', hint: 'When you are made a moderator of a club.', types: ['mod_assigned'] },
];

const plain = (key, params) => (params ? key.replace(/\{(\w+)\}/g, (m, name) => params[name]) : key);

export function timeAgo(iso, t = plain, locale) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return t('just now');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('{n}m ago', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('{n}h ago', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('{n}d ago', { n: days });
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}
