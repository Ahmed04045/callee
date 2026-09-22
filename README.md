# Circosodal

A community platform for students and young creators in Qatar: events to RSVP to, private university clubs to request to join, and gigs/opportunities to apply to. React + Vite + Tailwind on the frontend, Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) on the backend. Live at https://callee-sooty.vercel.app.

This README is the setup checklist. See **[DOCUMENTATION.md](./DOCUMENTATION.md)** for how the app is actually built — architecture, data model, features, theming, i18n.

## 1. Install and configure

```
npm install
```

Create `.env.local` in this folder (git-ignored, never commit it):

```
VITE_SUPABASE_URL=...              # Supabase dashboard -> Project Settings -> API
VITE_SUPABASE_ANON_KEY=...         # same page — the anon/public key, never the service-role key
VITE_GOOGLE_MAPS_API_KEY=...       # Google Cloud Console -> Credentials; restrict it by HTTP referrer
VITE_GOOGLE_MAP_ID=...             # optional — Google Cloud Console -> Maps -> Map IDs; falls back to a demo id
```

`npm run dev` starts the site at `http://localhost:5173`.

## 2. Database setup (Supabase SQL editor)

Run these **in order**, every time you set up a new Supabase project. Nothing here is optional except where noted.

| File | What it adds |
|---|---|
| `supabase/schema.sql` | Base tables: `events`, `gigs`, `announcements`, `profiles` |
| `002_gig_moderation.sql` | Gigs go through admin approval instead of appearing instantly |
| `003_user_profiles.sql` | The `profiles` table (name, DOB, bio) |
| `004_account_types_and_posting.sql` | Personal vs. business accounts |
| `005_account_types_personal_business_only.sql` | Locks the account-type check to those two values |
| `006_event_creation_and_attendees.sql` | Events go through the same create/approve flow as gigs, plus RSVPs |
| `007_photos_and_avatars.sql` | Storage buckets + policies for avatars and event photos |
| `008_discord_and_startups.sql` | **Only needed if you run the Discord bot.** `discord_links`, `profiles.discoverable`, startups |
| `009_clubs.sql` | Clubs/moderators, still publicly joinable at this point |
| `010_private_clubs_usernames.sql` | Clubs become private (request-to-join); usernames; user-made groups; location columns |
| `011_notifications.sql` | The `notifications` table and its triggers |
| `012_tickets_saves_reports_applicants.sql` | QR tickets, saved items, reports, applicant tracking |
| `013_questions_prefs_reminders.sql` | Custom questions on gigs/events/groups; notification mute preferences; event reminders |
| `014_career_book.sql` | The Receipts section (called "career_entries" in the schema; the on-screen name changed later, the table didn't) |
| `015_create_form_fields.sql` | Gig time commitment, event free/paid, club eligibility line; extends `create_group()` |
| `016_gig_and_group_photos.sql` | Cover photo for gigs, banner photo for groups |
| `017_identity_word.sql` | Drops the old "Aura" score; adds the identity-word columns |
| `018_repair_014_017.sql` | Only needed if 014–017 errored partway through for you and left the database in a mixed state (a Postgres quirk: `CREATE OR REPLACE FUNCTION` can't change a function's return columns — needs `DROP FUNCTION` first, which 014/017 didn't originally do). Safe to run even if 014–017 already applied cleanly; it's fully idempotent and ends with a sanity-check query — all 7 columns should read `true`. |

After running everything, promote yourself to admin (replace the email):

```sql
insert into app_admins (user_id)
select id from auth.users where email = 'you@example.com'
on conflict do nothing;
```

## 3. Auth providers

**Email/password** works out of the box. **Google sign-in** needs setup:
1. Google Cloud Console → Credentials → OAuth client (Web application).
2. Supabase dashboard → Authentication → Providers → Google → paste the client ID/secret.
3. Add both `http://localhost:5173` and your production URL to Supabase's redirect URLs and Google's authorized origins.

## 4. Google Maps

Location search (Create forms) and map pins (Discover) need **Places API (New)** and **Maps JavaScript API** enabled on `VITE_GOOGLE_MAPS_API_KEY`, and the key restricted to your site's domains (including the port for local dev) in Google Cloud Console.

## 5. Gemini Edge Functions (optional features)

Two features call Gemini from a Supabase Edge Function — never from the browser, so the API key never reaches the client. Both fail with a plain error message rather than breaking anything else if they're not set up:

- **Import from CV** (`supabase/functions/parse-cv`) — reads an uploaded CV/résumé, proposes Receipts entries to review before saving.
- **Find your word** (`supabase/functions/identity-word`) — turns four short answers about yourself into one word for a profile banner, plus a short reason.

To turn them on:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/). At this project's scale, prefer **Flash Lite** over plain Flash — same token quota, a much higher daily request cap.
2. Set the secret. Either the CLI (`npx supabase login`, then `npx supabase link --project-ref <ref>`, then `npx supabase secrets set GEMINI_API_KEY=<key>`), **or** the Supabase dashboard directly: Edge Functions → Secrets → add `GEMINI_API_KEY`. The dashboard is enough for the secret itself.
3. **Deploy the functions — this step needs the CLI, setting the secret alone does not do this:**
   ```
   npx supabase functions deploy parse-cv
   npx supabase functions deploy identity-word
   ```
4. Only set `GEMINI_MODEL` as an extra secret if the default model id baked into each function's `index.ts` is no longer current — Google AI Studio's own code sample for whichever model you pick shows the exact id string.

## 6. Discord bot (optional)

Lives in its own project: `../discord-bot` (a long-lived Node process, not deployable to Vercel). Needs `008_discord_and_startups.sql` run first. See that project's own README for its setup and `.env`.

## 7. Deploying the site

Vercel, pointed at this folder, with the four `VITE_*` env vars above set in the Vercel project settings (not just `.env.local`, which never leaves your machine). Push to `main` to deploy.

## Notes

- **Languages:** English and Arabic (right-to-left). Every string goes through `t('English text')`; the Arabic dictionary is `src/i18n/ar*.js`. A string missing from the dictionary just shows in English — it never breaks the page.
- **Themes:** four color palettes and two visual styles (plain, pixel) — see DOCUMENTATION.md.
