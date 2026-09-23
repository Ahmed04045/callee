// src/lib/careerBook.js
//
// The six entry types a personal profile's Receipts section can hold. The
// underlying table (career_entries) has one shared column set — title,
// organization, role, dates, description, link — but the questions asked
// for each column differ per kind via FIELD_CONFIG below, so filling out a
// "Project" feels different from filling out an "Achievement" even though
// both save to the same columns.

export const CAREER_KINDS = [
  { id: 'project', label: 'Project', icon: 'folder_open', hint: 'Something you designed, built or shipped.' },
  { id: 'experience', label: 'Experience or internship', icon: 'work', hint: 'An internship, paid assignment or real work placement.' },
  { id: 'achievement', label: 'Achievement or award', icon: 'military_tech', hint: 'A win, award, scholarship or recognition.' },
  { id: 'competition', label: 'Competition or hackathon', icon: 'emoji_events', hint: 'A hackathon, contest or challenge you took part in.' },
  { id: 'leadership', label: 'Leadership or volunteering', icon: 'groups', hint: 'Leading a team, club or community effort.' },
  { id: 'milestone', label: 'Meaningful milestone', icon: 'flag', hint: "A milestone that doesn't fit the other types." },
];

export const kindMeta = (id) => CAREER_KINDS.find((k) => k.id === id) ?? CAREER_KINDS[0];

// Per-kind question set. Every kind still maps to the same 8 columns
// (title, organization, role, description, link, start_date, end_date,
// is_ongoing) — only the label, placeholder and which fields show change.
const FIELD_CONFIG = {
  project: {
    title: { label: 'Project name', placeholder: 'e.g. Campus food-delivery app' },
    organization: { label: 'Built for / platform (optional)', placeholder: 'e.g. Personal project, a class, a client' },
    role: { label: 'Your role (optional)', placeholder: 'e.g. Solo builder, frontend lead' },
    link: { label: 'Live link or repo (optional)', placeholder: 'https://' },
    showDates: true,
  },
  experience: {
    title: { label: 'Job title', placeholder: 'e.g. Marketing Intern' },
    organization: { label: 'Company or organization', placeholder: 'e.g. Ooredoo Qatar' },
    role: { label: 'Team or department (optional)', placeholder: 'e.g. Digital Marketing' },
    link: { label: 'Company site or proof (optional)', placeholder: 'https://' },
    showDates: true,
  },
  achievement: {
    title: { label: 'Award or achievement name', placeholder: 'e.g. Dean’s List, Best Newcomer' },
    organization: { label: 'Awarded by', placeholder: 'e.g. Your university' },
    role: { label: null },
    link: { label: 'Link to proof (optional)', placeholder: 'https://' },
    showDates: true,
  },
  competition: {
    title: { label: 'Competition or hackathon name', placeholder: 'e.g. Qatar National Hackathon' },
    organization: { label: 'Organizer (optional)', placeholder: 'e.g. Qatar Foundation' },
    role: { label: 'Your role or result (optional)', placeholder: 'e.g. Team lead, 2nd place' },
    link: { label: 'Project or results link (optional)', placeholder: 'https://' },
    showDates: true,
  },
  leadership: {
    title: { label: 'Position or initiative', placeholder: 'e.g. President, Volunteer Coordinator' },
    organization: { label: 'Team or organization', placeholder: 'e.g. Robotics Club' },
    role: { label: null },
    link: { label: 'Link to proof (optional)', placeholder: 'https://' },
    showDates: true,
  },
  milestone: {
    title: { label: 'What happened', placeholder: 'e.g. Graduated with honors' },
    organization: { label: null },
    role: { label: null },
    link: { label: 'Link to proof (optional)', placeholder: 'https://' },
    showDates: false,
  },
};

export const kindFields = (id) => FIELD_CONFIG[id] ?? FIELD_CONFIG.project;

/** A short "Jan 2025 – Mar 2025" / "Jan 2025 – Present" range from what the entry has. */
export function dateRange(entry, t, locale) {
  const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  if (!entry.start_date) return null;
  const start = fmt(entry.start_date);
  if (entry.is_ongoing) return `${start} – ${t('Present')}`;
  if (entry.end_date) return `${start} – ${fmt(entry.end_date)}`;
  return start;
}
