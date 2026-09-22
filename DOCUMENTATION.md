# Circosodal — full documentation

For setup steps, see [README.md](./README.md). This is how the app is built.

## What it is

A community platform for university students in Qatar (currently UDST, more to follow):
- **Events** — post, RSVP, get a QR ticket, organizer scans people in.
- **Clubs/groups** — private; you request to join, a moderator approves.
- **Gigs/opportunities** — post a role, applicants apply with a message, contact info and answers to the poster's own questions.
- **Receipts** — a personal profile's proof-of-work log (projects, experience, achievements, competitions, leadership, milestones), readable by whoever's deciding on your application.
- **Find your word** — four short questions about yourself, answered by an AI-picked word for your profile banner.

## Tech stack

- **Frontend:** React 18, Vite, Tailwind CSS 3.4, react-router-dom v7.
- **Backend:** Supabase — Postgres with Row Level Security as the real authorization layer (not just the app's own checks), Auth (email + Google), Storage, Realtime (notifications), Edge Functions (the two Gemini calls).
- **Maps:** `@vis.gl/react-google-maps` (Places Autocomplete for location entry, pins on Discover).
- **AI:** Google Gemini, called only from Edge Functions, never from the browser.
- **Hosting:** Vercel (site), Supabase (everything else). The Discord bot is a separate always-on Node process, not on Vercel.

## Repo layout

```
src/
  views/            one file per route/page
    create/           the three Create forms (Gig, Event, Group) + shared bits (formKit.jsx)
    admin/            admin-only pages, gated by is_admin()
  components/       shared UI: modals, cards, nav, the theme-aware Icon
  context/          React context providers: Auth, Profile, Notifications, CreateModal
  lib/              pure helpers: options lists, validation, image upload, i18n-adjacent utilities
  theme/            themeConfig.js (design tokens), theme.js (the store), iconMap.js (Material name -> Pixelarticons glyph)
  i18n/             ar1.js … ar7.js (the Arabic dictionary, split into files by feature added), index.js (the t() machinery)
supabase/
  schema.sql          base tables
  migrations/         002 … 017, run in order — see README's table
  functions/          parse-cv, identity-word (Deno Edge Functions)
```

## Data model (the load-bearing tables)

- `profiles` — one row per `auth.users` id. Display name, username, bio, university, avatar, `account_type` (personal/business), `is_public`, `discoverable` (Discord bot search), `looking_for` (tags), `identity_word` + `identity_word_reason`, `profile_views`.
- `events` / `gigs` / `clubs` — each has a `status` (`pending` → `approved`/`rejected`) that gates public visibility; only admins can move that needle (`is_admin()`). Each can carry a `questions` (or `join_questions` for clubs) jsonb column — see "Custom questions" below.
- `club_memberships`, `club_join_requests`, `club_moderators` — clubs are **private by design**: no direct join, only `request_join_club()` → a moderator calls `review_join_request()`. WhatsApp/Discord links only ever come back from `get_club_links()`, which checks membership server-side.
- `event_attendees` — one row per RSVP, carries a unique `ticket_code` (the QR content) and `checked_in_at`.
- `applications` — one row per gig application, with the applicant's message, contact method/value, and answers.
- `career_entries` — the Receipts entries. Shown as "Receipts" on screen; the table name is a holdover from when it was "Career Book."
- `notifications` — created entirely by database triggers (never inserted by the client), filtered through `notification_prefs.muted_types` before they're written.

**Everything sensitive is gated by RLS, not just app logic.** A user calling the REST API directly, bypassing the UI, still hits the same rules. Read the top-of-file comment in each migration before changing anything — most explain *why* a rule exists, not just what it does.

## Custom questions (gigs, events, clubs)

One shared shape everywhere: a question is `{ id, label, type: 'text'|'long'|'choice'|'yesno', required, options? }`; an answer set is `{ [id]: string }`. `src/lib/questions.js` has the helpers; `src/components/Questions.jsx` has the three pieces (`QuestionBuilder` for the creator, `AnswerForm` for the respondent, `AnswersView` for whoever reads the answers back). The database re-validates required answers server-side (`validate_answers()`) — the client-side check is just for a faster no-network round trip.

## Notifications

Every notification is created by a Postgres trigger with `push_notification()`, which checks `notification_prefs.muted_types` before writing anything — a muted category is never created, not just hidden. The client re-renders the text in the reader's own language from `type` + a `data` jsonb column (see `src/lib/notificationMeta.js`'s `notificationText()`), so translation doesn't depend on what language was active when the trigger fired.

## Theming

Four color palettes (electric/ultraviolet/acid/paper) × two visual styles (plain, pixel), independently switchable, both persisted per device. `src/index.css` defines each palette as CSS variables (`--md3-*`, "R G B" triplets so Tailwind's opacity modifiers still work, e.g. `bg-md3-primary/20`); `src/theme/themeConfig.js` is where components pull tokens from (`colors.*`, `radius.*`, `font.*`) instead of hard-coding Tailwind classes, so a new palette or style needs no component changes. `Icon.jsx` renders Material Symbols glyphs in the plain style and Pixelarticons glyphs in the pixel style from one shared icon name — `iconMap.js` is the translation table; a name used but not mapped there falls back to a plain square and logs a dev warning.

## Internationalization

English is the key: every string goes through `t('English text', { placeholders })`. The Arabic dictionary is a plain object, `src/i18n/ar.js` merging `ar1.js` … `ar7.js` (split by when a feature was added, not by topic — check all of them before assuming a string has no translation). A key missing from the dictionary just renders in English; nothing throws. `useT()` gives `{ t, lang, dir, isRtl, setLanguage }`; switching language flips `<html dir>` and the whole layout mirrors via Tailwind's logical properties (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`) rather than `left`/`right`.

**The Arabic text has not been reviewed by a native speaker.** Treat it as a solid first pass, not a final translation, before a real launch.

## AI features (Gemini, via Edge Functions)

Both `supabase/functions/parse-cv` and `supabase/functions/identity-word` follow the same shape: receive JSON, call `generativelanguage.googleapis.com`, ask for `responseMimeType: 'application/json'`, and — critically — **never trust the model's output as-is**. Every field coming back is type-checked and length-capped before it reaches the client (wrong type, wrong shape, or a missing field falls back to a safe default rather than being passed through). Supabase's default JWT verification means neither function runs for a signed-out request, so there's no separate auth check needed inside them.

## Known gaps (be honest about these if asked)

- **No self-serve account deletion** — a user has to be emailed and removed manually today.
- **No formal age verification or parental consent** for minors, despite Qatar's PDPPL calling for it — the Privacy Policy says this plainly rather than claiming a compliance mechanism that doesn't exist.
- **Arabic translations are unreviewed.**
- **The Android app** (`../app`) still targets an older, app-only backend design and has not been migrated onto this Supabase schema.
- **No automated tests.** Every change in this project has been verified by build + lint + manual/scripted browser checks, not a test suite.
