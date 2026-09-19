// src/lib/username.js
//
// Username rules mirror the database (profiles_username_format in
// 010_private_clubs_usernames.sql): 3-20 chars of a-z, 0-9 and underscore.
// The database is the real gate (unique index + check constraint); these
// helpers just give instant feedback and generate suggestions.

import { supabase } from './supabaseClient';

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

function slug(text) {
  return (text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s._-]/g, '')
    .trim();
}

/**
 * Candidate usernames built from a display name and/or email local part.
 * Pure function (no network) so it can be tested on its own.
 * @returns {string[]} unique, well-formed candidates, best first
 */
export function generateUsernameCandidates(name, email, random = Math.random) {
  const words = slug(name).split(/[\s._-]+/).filter(Boolean);
  const local = slug((email || '').split('@')[0]).replace(/[._-]+/g, '');
  const first = words[0] || '';
  const last = words.length > 1 ? words[words.length - 1] : '';
  const digits = () => String(Math.floor(random() * 90) + 10);

  const raw = [
    words.join(''),
    first && last ? `${first}_${last}` : '',
    first && last ? `${first}${last[0]}` : '',
    first && last ? `${first[0]}${last}` : '',
    local,
    first ? `${first}${digits()}` : '',
    words.join('') ? `${words.join('')}${digits()}` : '',
    local ? `${local}${digits()}` : '',
    first ? `${first}_${digits()}` : '',
    `user${digits()}${digits()}`,
  ];

  const seen = new Set();
  const out = [];
  for (const candidate of raw) {
    const clean = normalizeUsername(candidate);
    if (USERNAME_PATTERN.test(clean) && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

export async function isUsernameAvailable(username) {
  if (!USERNAME_PATTERN.test(username)) return false;
  const { data, error } = await supabase.rpc('username_available', { p_username: username });
  return !error && data === true;
}

/** Candidates filtered down to ones that are actually free right now. */
export async function suggestAvailableUsernames(name, email, max = 4) {
  const candidates = generateUsernameCandidates(name, email);
  const checks = await Promise.all(candidates.map((c) => isUsernameAvailable(c).then((ok) => (ok ? c : null))));
  return checks.filter(Boolean).slice(0, max);
}
