// src/lib/clubUtil.js
//
// Small helpers shared by the Clubs (Circosodal) views.

export const MAX_CLUBS = 5;

// The clubs table stores banner colours as 0xAARRGGBB numbers (same values
// the Android app uses).
export const argbToHex = (n) => '#' + (Number(n) & 0xffffff).toString(16).padStart(6, '0');

export const bannerStyle = (club) => ({
  backgroundImage: `linear-gradient(135deg, ${argbToHex(club.banner_gradient_start)}, ${argbToHex(club.banner_gradient_end)})`,
});

// The two member-only link columns are deliberately NOT selectable from the
// clubs table (see 009_clubs.sql) — always use this explicit column list.
export const CLUB_COLUMNS =
  'id,name,university_id,university_name,description,member_count,category,banner_gradient_start,banner_gradient_end,meeting_schedule,room_or_location';

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const ACTION_LABEL = {
  JOINED: 'Joined',
  LEFT: 'Left',
  REMOVED_BY_MOD: 'Removed by moderator',
  MOD_ASSIGNED: 'Moderator assigned',
  MOD_REMOVED: 'Moderator removed',
};

export const JOIN_MESSAGES = {
  LIMIT_REACHED: `You can join up to ${MAX_CLUBS} clubs. Leave one to join another.`,
  ALREADY_MEMBER: 'You are already a member of this club.',
  NOT_AUTHENTICATED: 'Please sign in first.',
  NOT_FOUND: 'Club not found.',
};
