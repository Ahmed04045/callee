# Circosodal

A community platform for students and young creators in Qatar: events to RSVP to, private university clubs to request to join, and gigs/opportunities to apply to. React + Vite + Tailwind on the frontend, Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) on the backend.

**Try the website first: [Circosodal live demo](https://callee-sooty.vercel.app/).** Have a look around before deciding whether to use or build on this repository.

## A note from the creator

I spent months working on this project. It began with the hope of building a competitor to Wohaj: a place where students in Qatar could find opportunities, meet people, and make things happen together.

Over time, that dream slowly faded. As I watched Wohaj receive the spotlight and support in Qatar, I found it harder to see a path forward for my own project. I'm no longer actively working on the website, but I still care about what I built.

I'm grateful for the months I spent with this project, for everything it taught me, and for the chance to turn an idea I cared about into something real. Thank you to anyone who takes the time to visit the website, read the code, or give it another chance.

My hope is that another student will pick it up and take it somewhere I couldn't. You can improve it, adapt it for your university, learn from it, or build something entirely your own. I'm releasing it under the MIT license so that this work can keep being useful, even if I'm no longer the person moving it forward.

If you're that student: you're welcome here. The code, documentation, and remaining ideas are yours to explore. I can't promise ongoing maintenance or quick responses, so please feel free to continue the work in your own fork.

This README is the setup checklist. See **[DOCUMENTATION.md](./DOCUMENTATION.md)** for how the app is actually built — architecture, data model, features, theming, i18n.

## 1. Install and configure

```
npm install
```

Copy `.env.example` to `.env.local` in this folder (git-ignored, never commit it), then fill in your public configuration:

```
VITE_SUPABASE_URL=...              # Supabase dashboard -> Project Settings -> API
VITE_SUPABASE_ANON_KEY=...         # same page — the anon/public key, never the service-role key
VITE_GOOGLE_MAPS_API_KEY=...       # Google Cloud Console -> Credentials; restrict it by HTTP referrer
VITE_GOOGLE_MAP_ID=...             # optional — Google Cloud Console -> Maps -> Map IDs; falls back to a demo id
```

`npm run dev` starts the site at `http://localhost:5173`.

## 2. Database setup (Supabase SQL editor)

The migrations record how the project grew over those months: from simple listings to moderated posts, private clubs, tickets, profiles and organizer tools. They add database columns, tables, functions, storage policies and access rules that the frontend expects. `schema.sql` is the starting point, **not** a complete current database.

For a fresh Supabase project, run `supabase/schema.sql` once, then the files in `supabase/migrations/` in numeric order from **002 through 021**. There is no separate `001` migration. Including the repair files is the simplest setup path; their exceptions are explained below. Stop on SQL errors and resolve them before continuing. On an existing installation, apply missing changes in order rather than replaying the base schema or every historical migration.

**Essential** below means required to run the current frontend unchanged. A feature being optional to use does not make its database columns optional. **Repair** means the file can be skipped on a clean installation using the corrected earlier files, but is needed for affected older installations.

| File | Needed? | Why it exists |
|---|---|---|
| `supabase/schema.sql` | Essential | Creates the original `events`, `gigs`, `announcements` and `applications` tables, initial RLS policies and sample listings. Profiles come later in 003. |
| `002_gig_moderation.sql` | Essential | Adds `app_admins`, the `is_admin()` helper and gig approval status. Later migrations depend on this authorization layer. |
| `003_user_profiles.sql` | Essential | Adds profiles, private profile access and automatic profile creation at signup. |
| `004_account_types_and_posting.sql` | Essential | Adds account type, university, gig ownership and user posting. This file still introduces the older account-type values; run 005 next. |
| `005_account_types_personal_business_only.sql` | Essential | Converts the older account types to `business` and restricts values to `personal`/`business`, as the current onboarding expects. |
| `006_event_creation_and_attendees.sql` | Essential | Adds event ownership, moderation, creation fields and RSVPs, with attendee access rules and remaining-seat updates. |
| `007_photos_and_avatars.sql` | Essential | Adds avatar/event-photo storage buckets, upload policies and the corresponding database fields. |
| `008_discord_and_startups.sql` | Essential for the unchanged frontend | Adds Discord linking, startup tables and `profiles.discoverable`. The current profile editor writes `discoverable` and Account reads `discord_links`, even without a running bot. See the optional-services note below. |
| `009_clubs.sql` | Essential | Adds clubs, memberships, moderators and controlled access to private community links. It also extends signup/profile handling. |
| `010_private_clubs_usernames.sql` | Essential | Changes clubs to request-and-approval membership, adds user-created groups, usernames, public-profile functions and location fields. Do not stop at 009 for the current private-club behavior. |
| `011_notifications.sql` | Essential | Adds in-app notifications, database triggers and Realtime support for the notification bell. |
| `012_tickets_saves_reports_applicants.sql` | Essential | Adds QR tickets, organizer check-in, saved items, reports and applicant tracking. The organizer tools depend on this. |
| `013_questions_prefs_reminders.sql` | Essential; scheduling is optional | Adds custom questions/answers, application details and validation, notification preferences and reminder functions. Automatic reminders additionally need a working `pg_cron` schedule. |
| `014_career_book.sql` | Essential | Adds the proof-of-work entries now called Receipts, profile views and interest tags. Its original Aura score is removed by 017. |
| `015_create_form_fields.sql` | Essential | Adds gig commitment, free/paid event fields and club eligibility; extends the group-creation function and grants access to the new public club column. |
| `016_gig_and_group_photos.sql` | Essential | Adds gig covers and group banners, storage policies and narrowly scoped image-update functions. |
| `017_identity_word.sql` | Essential; AI service is optional | Removes Aura, adds identity-word fields and updates the public-profile function. Apply this even if you do not deploy the Gemini feature. |
| `018_repair_014_017.sql` | Repair | Repairs partially applied older versions of 014–017, including changed function return shapes. Skip if the corrected files applied cleanly; otherwise run after 017 and before 020. Its final sanity check should return seven `true` values. |
| `019_grant_new_club_columns.sql` | Repair | Grants read access to `who_can_join` and `banner_image_url` to fix older installations with club permission errors. Redundant if the corrected 015/016 or 018 already supplied those grants. |
| `020_profile_social_links.sql` | Essential | Adds GitHub, LinkedIn, Instagram and website fields and extends the public-profile function to return them. |
| `021_announcements_bilingual_admin.sql` | Essential for announcement administration | Adds Arabic announcement fields and admin write policies for `/admin/announcements`. Arabic content itself may be left blank. Include this for the complete current site. |

**What can you leave out?** The Discord bot process, Gemini Edge Function deployments, Google sign-in and scheduled reminders are optional services. The Maps key is only needed for the map and place-search flows; those flows will not work without it. Keep the schema migrations for the unchanged app. You can omit 008 only in a customized fork that also removes the Discord/account-link queries and `discoverable` profile reads/writes. You can skip 018 and 019 when their repairs are already present.

The reminders in 013 are **in-app notifications, not emails**. The migration attempts to schedule them for 18:00 Qatar time; if it reports that `pg_cron` or scheduling is unavailable, the other features can still work, but automatic reminders need that setup completed.

Apply repairs in sequence: 018 recreates an older public-profile function shape, while 020 adds social links to that function. If repairing a database that already had 020, reapply 020 after 018. The sample listings in `schema.sql` are demonstration data, not required application records; review or remove them before your own launch.

After setup, create your account through the website, then promote it to admin in the SQL editor (replace the email):

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

The bot was developed as a separate sibling project, `../discord-bot` (a long-lived Node process, not deployable to Vercel). It is not included in this repository. If you have that project, see its own README for setup and `.env`. Running the bot is optional; keep migration 008 for the website's existing profile/account fields even if you do not run it.

## 7. Deploying the site

Vercel, pointed at this folder, with the four `VITE_*` env vars above set in the Vercel project settings (not just `.env.local`, which never leaves your machine). Push to `main` to deploy.

## Notes

- **Languages:** English and Arabic. Switching languages preserves the layout, sidebar, topbar and mobile navigation positions. Arabic text keeps its natural reading order. Every string goes through `t('English text')`; the Arabic dictionary is `src/i18n/ar*.js`. A missing translation falls back to English.
- **Themes:** four color palettes and two visual styles (plain, pixel) — see DOCUMENTATION.md.

## Organizer and ticket tools

- **Organizer hub:** open `/organizer`, or follow the link from Home or Settings. Search and filter your events, see review status and reserved seats, and jump to attendee management or QR scanning. Existing per-event management includes check-in, CSV export and RSVP charts.
- **Offline QR:** each ticket has a **Download QR code** button for a PNG you can save on your phone. The QR contains a ticket credential; keep it private. Saved images remain subject to server-side validity and cancellation checks.
- **Calendar export:** **Add to calendar** downloads an `.ics` file with event details and the public event link, without your ticket code. Times are interpreted as Qatar local time (UTC+03:00); events without a start time export as all-day entries. No end time is invented. Imported entries do not automatically update when an event changes.
- These features use the existing schema; no additional migration or email provider is required. Ticket email delivery is not implemented.

## Contributing and release preparation

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development checks, release prerequisites and proposed follow-up features. Run `npm test` for calendar export regression tests. Student contributors and independent forks are welcome; the project is not actively maintained by its original creator.

## License

Released under the [MIT License](./LICENSE). You are welcome to use, modify and build on the project, including commercially, provided you retain the license's copyright and permission notice. Dependencies and third-party assets retain their own licenses. The license does not grant access to the hosted website's accounts, private data or service credentials.
