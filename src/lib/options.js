// src/lib/options.js
//
// Fixed choices for the Create forms. Things that used to be typed by hand
// (tags, compensation, contact details, links) are chosen or validated here.

export const EVENT_TYPES = ['Hackathon', 'Workshop', 'Meetup', 'Conference', 'Networking', 'Competition', 'Social', 'Other'];

export const GIG_TAGS = [
  'Tech', 'Coding', 'Design', 'Art', 'Media', 'Video', 'Music', 'Fashion',
  'Marketing', 'Writing', 'Business', 'Photography', 'Gaming', 'Education',
];
export const MAX_TAGS = 4;

export const COMPENSATION_OPTIONS = ['Paid', 'Unpaid', 'Equity', 'Paid + equity', 'Profit share', 'Negotiable'];
export const PAID_COMPENSATIONS = ['Paid', 'Paid + equity'];

export const GROUP_CATEGORIES = [
  'Arts & Culture', 'Academic & Leadership', 'Sports & Athletics', 'Technology & Gaming', 'Service & Community',
  'Faith & Community', 'Cultural & Heritage', 'Media & Arts', 'Lifestyle & Skills', 'Social & Gaming', 'Other',
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CONTACT_METHODS = [
  { id: 'phone', label: 'Phone number', placeholder: '5555 5555', kind: 'phone' },
  { id: 'whatsapp', label: 'WhatsApp number', placeholder: '5555 5555', kind: 'phone' },
  { id: 'instagram', label: 'Instagram handle', placeholder: 'yourhandle', kind: 'handle' },
  { id: 'telegram', label: 'Telegram handle', placeholder: 'yourhandle', kind: 'handle' },
  { id: 'discord', label: 'Discord username', placeholder: 'username', kind: 'discord' },
];

/**
 * Validates and normalizes a contact value for a given method.
 * @returns {{ok: boolean, value?: string, error?: string}}
 */
export function validateContact(methodId, raw) {
  const method = CONTACT_METHODS.find((m) => m.id === methodId);
  const value = (raw || '').trim();
  if (!method) return { ok: false, error: 'Pick a contact method.' };
  if (!value) return { ok: false, error: 'Enter your contact details.' };

  if (method.kind === 'phone') {
    const digits = value.replace(/[^\d]/g, '');
    // Qatar numbers are 8 digits (optionally +974); allow other international lengths up to 15.
    const local = digits.startsWith('974') && digits.length === 11 ? digits.slice(3) : digits;
    if (local.length < 8 || local.length > 15) return { ok: false, error: 'Enter a valid phone number.' };
    return { ok: true, value: local.length === 8 ? `+974 ${local}` : `+${digits}` };
  }
  if (method.kind === 'handle') {
    const handle = value.replace(/^@/, '');
    if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) return { ok: false, error: 'Handles use letters, numbers, dots and underscores.' };
    return { ok: true, value: `@${handle}` };
  }
  // discord
  const name = value.replace(/^@/, '');
  if (!/^[a-z0-9._]{2,32}$/i.test(name)) return { ok: false, error: 'Enter a valid Discord username.' };
  return { ok: true, value: name };
}

export const WHATSAPP_LINK = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+/;
export const DISCORD_LINK = /^https:\/\/(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9_-]+/;
