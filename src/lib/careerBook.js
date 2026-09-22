// src/lib/careerBook.js
//
// The six entry types a personal profile's Receipts section can hold. Kept to
// one shared field set (title, organization, role, dates, description,
// link) across all six rather than a different form per type — the type
// itself is the signal, the fields don't need to change with it.

export const CAREER_KINDS = [
  { id: 'project', label: 'Project', icon: 'folder_open', hint: 'Something you designed, built or shipped.' },
  { id: 'experience', label: 'Experience or internship', icon: 'work', hint: 'An internship, paid assignment or real work placement.' },
  { id: 'achievement', label: 'Achievement or award', icon: 'military_tech', hint: 'A win, award, scholarship or recognition.' },
  { id: 'competition', label: 'Competition or hackathon', icon: 'emoji_events', hint: 'A hackathon, contest or challenge you took part in.' },
  { id: 'leadership', label: 'Leadership or volunteering', icon: 'groups', hint: 'Leading a team, club or community effort.' },
  { id: 'milestone', label: 'Meaningful milestone', icon: 'flag', hint: "A milestone that doesn't fit the other types." },
];

export const kindMeta = (id) => CAREER_KINDS.find((k) => k.id === id) ?? CAREER_KINDS[0];

/** A short "Jan 2025 – Mar 2025" / "Jan 2025 – Present" range from what the entry has. */
export function dateRange(entry, t, locale) {
  const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  if (!entry.start_date) return null;
  const start = fmt(entry.start_date);
  if (entry.is_ongoing) return `${start} – ${t('Present')}`;
  if (entry.end_date) return `${start} – ${fmt(entry.end_date)}`;
  return start;
}
