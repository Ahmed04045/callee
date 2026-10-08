# Task: move the Circosodal Android app onto the shared Supabase backend

> Historical, unfinished implementation brief. The app has not been tried by its creator and may have bugs. This file describes proposed work, not completed functionality. See [README.md](./README.md) for the imported project's actual setup and limitations. Website paths below are relative to the repository root (one directory above this file); use all current migrations through 021, not only the older 002–013 subset mentioned in the original brief. Current SQL and website behavior take precedence, including the website's stable Arabic layout and later group/profile function changes.

You are updating an existing Kotlin + Jetpack Compose Android app (package `com.example`, Room, OkHttp/Retrofit/Moshi, Material 3, Coil, navigation-compose). It was built first, against an **old, app-only backend design**. The company has since built a website (React) on a **new Supabase schema with real authentication and Row Level Security**. The app must now become a second client of that same backend, with the same accounts and the same data.

Attach these files when you paste this brief (they are the source of truth, read them before writing code):
- `supabase/schema.sql` and every file in `supabase/migrations/` (`002` … `013`) from the website repo (https://github.com/Ahmed04045/callee).
- The website's `src/lib/questions.js`, `src/lib/options.js`, `src/lib/notificationMeta.js` and `src/i18n/ar*.js` (for question types, option lists, notification wording and Arabic strings).

If anything in this brief disagrees with the SQL, **the SQL wins**. If something is unclear, say what you assumed in the final summary; do not invent columns or RPCs.

---

## 1. What is wrong with the app today (fix all of it)

1. **Custom auth with passwords in the local database.** `UserEntity` stores a `password` in Room, and `SupabaseClient.kt` reads and writes a public `users` table with the anon key. This is insecure and does not exist in the new backend. **Delete it.** Use Supabase Auth instead (section 3). No password is ever stored on the device.
2. **Roles in a `users.role` column.** Admin and moderator status now come from the database (`app_admins`, `club_moderators`, functions `is_admin()` and `is_club_mod(club_id)`). Remove `role` logic based on local rows.
3. **Local-only data.** Clubs, news, memberships, audit logs and "InitialData.kt" seed data live in Room and are made up. Replace with live Supabase data. **Delete `InitialData.kt` and all seed/mock data.** Room may remain only as a small read cache for offline viewing; it must never be the source of truth and must never contain anything secret.
4. **Users can no longer join clubs directly.** Clubs are private: a user sends a join request and a moderator approves. Direct `join_club` is disabled for clients.
5. **The app has no events, gigs, tickets, applications or notifications**, all of which the website has.
6. Hard-coded strings and left-to-right assumptions: the app must support **English and Arabic (RTL)**.

---

## 2. Connection

- Base URL and anon key come from `BuildConfig` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), read from `local.properties` or the environment. **Never commit keys.** Never use or ship the service-role key; the app only ever uses the anon key plus the signed-in user's access token.
- Every REST call sends `apikey: <anon key>` and `Authorization: Bearer <user access token>` (or the anon key when signed out).
- PostgREST is at `$URL/rest/v1/<table>`, RPCs at `$URL/rest/v1/rpc/<function>` (JSON body of named args), Auth at `$URL/auth/v1/...`, Storage at `$URL/storage/v1/...`.
- You may use `supabase-kt` (io.github.jan-tennert.supabase: auth-kt, postgrest-kt, storage-kt, realtime-kt) or plain OkHttp/Retrofit. Pick one and use it consistently. A small repository layer per feature, `suspend` functions, `Result`-style error handling, and user-friendly messages (map the RPC error codes below).
- Store the session (access + refresh token) in `EncryptedSharedPreferences` or DataStore with encryption, refresh it before expiry, and sign the user out cleanly if refresh fails.

---

## 3. Authentication and onboarding (must match the website)

- Email + password: `POST /auth/v1/signup`, `POST /auth/v1/token?grant_type=password`, refresh with `grant_type=refresh_token`, password reset with `POST /auth/v1/recover`. New accounts must confirm their email before they can sign in.
- **Continue with Google:** Android Credential Manager + `googleid`, then exchange the Google ID token with `POST /auth/v1/token?grant_type=id_token` (`{"provider":"google","id_token":"..."}`). The Google web client ID is the same one configured in Supabase (Auth → Providers → Google); read it from BuildConfig.
- A row in `profiles` is created automatically by the `handle_new_user` trigger. After sign-in, load `profiles` for the user. **If `account_type` or `username` is null, show onboarding** before anything else:
  1. account type: `personal` or `business`
  2. display name (prefill from Google name)
  3. username: 3-20 chars `[a-z0-9_]`, live availability check with RPC `username_available(p_username)`, plus suggestions (name, name_12, firstlast)
  4. university (personal only), from the same list the website uses (`EDUCATION_OPTIONS`; UDST is the one with clubs today). Skippable.
  Save with `PATCH /rest/v1/profiles?user_id=eq.<uid>`.
- Profile edit: name, bio (max 200), university, avatar (upload to the `avatars` Storage bucket under a folder named after the user id, see `007_photos_and_avatars.sql`; event photos use the other bucket defined there), `is_public` toggle, `discoverable` toggle (Discord bot search). `email` and `username` rules are enforced by triggers; surface their errors.
- Public profile by username: RPC `get_public_profile(p_username)` (returns nothing when private). Share link format: `https://callee-sooty.vercel.app/u/<username>`.

---

## 4. Backend contract (tables and RPCs the app must use)

RLS protects everything; the app never needs elevated access. All ids are `uuid` unless noted; **club ids are `text`**.

### Read (anon or signed in)
- `events` where `status = 'approved'` and `event_date >= today`, order by `event_date`, `start_time`. Columns include `id, title, organizer, event_date, start_time, location, lat, lng, place_id, event_type, tag, description, capacity, capacity_hidden, spots, questions, contact_method, contact_value, posted_by_user_id, status`. If `capacity_hidden` is true, never show seat numbers to the public. Photos: `event_photos` (max 5 per event).
- `gigs` where `status = 'approved'` and (`deadline is null` or `deadline >= today`). Columns include `id, role, posted_by, compensation, tags, description, location, lat, lng, is_remote, deadline, questions, posted_by_user_id, kind`.
- `clubs` where `status = 'approved'`. Columns: `id, name, university, description, member_count, category, banner_gradient_start, banner_gradient_end, meeting_schedule, room_or_location, join_questions, owner_user_id, lat, lng, place_id`. **WhatsApp/Discord links are private:** fetch them only through RPC `get_club_links(p_club_id)`, which returns them only to members, moderators and admins.
- `announcements` and `club_news` for the news feed.

### Clubs (private, request to join)
- `request_join_club(p_club_id text, p_message text, p_answers jsonb)` returns a text code: `OK`, `LIMIT_REACHED` (max 5 clubs), `ALREADY_MEMBER`, `ALREADY_REQUESTED`, `NOT_AUTHENTICATED`, `NOT_FOUND`, plus answer errors (`ANSWER_REQUIRED`, `ANSWER_TOO_LONG`, `ANSWER_INVALID`). Show the club's `join_questions` in a dialog first.
- `cancel_join_request(p_club_id)`, `leave_club(p_club_id)`, `remove_club_member(p_club_id, p_user_id)` (moderators), `review_join_request(p_request_id, p_approve)` (moderators; codes include `OK`, `USER_AT_LIMIT`, `ALREADY_REVIEWED`), `set_join_questions(p_club_id, p_questions)`, `assign_club_moderator` / `remove_club_moderator` (admins).
- Tables: `club_memberships`, `club_join_requests (status pending|approved|declined, message, answers)`, `club_moderators`, `club_audit_logs`.
- Users create groups with RPC `create_group(...)` `create_group(p_name, p_description, p_category, p_university, p_whatsapp_link, p_discord_link, p_meeting_schedule, p_location, p_place_id, p_lat, p_lng)` returns the new club id as text; then call `set_join_questions(p_club_id, p_questions)` if the creator added questions; groups start `pending` until an admin runs `review_group(p_club_id, p_approve)`.

### Events, tickets, RSVP
- RSVP = insert into `event_attendees (event_id, user_id, answers)`; cancelling = delete own row. A trigger enforces capacity and required answers (`trg_check_rsvp`). Each row gets a unique `ticket_code`.
- **QR tickets:** render `ticket_code` as a QR code (use ZXing `zxing-android-embedded` or `com.google.zxing:core`). Layout: event title, date, place, "Admit one", QR, and a "Checked in" state when `checked_in_at` is set.
- **Organizer scanner (for event owners):** scan QR with CameraX + ML Kit barcode scanning, then RPC `check_in_ticket(p_code)` (returns jsonb `{ "status": "OK" | "ALREADY" | "OWN_TICKET" | "FORBIDDEN" | "NOT_FOUND", "name", "event_id", "event_title", ... }`); `set_check_in(p_attendee_id, p_checked)` to undo. Also a manual code entry field.
- Organizer dashboard: RSVP count, checked-in count, seats left, attendee list with answers, CSV share.

### Gigs and applications
- Apply = insert into `applications (gig_id, user_id, answers jsonb, message, contact_method, contact_value)`. Contact methods: phone, whatsapp, instagram, telegram, discord, email (validate like the website's `validateContact`). Show the gig's `questions` in a form, enforce required ones. Errors from triggers: `DEADLINE_PASSED`, `GIG_NOT_AVAILABLE`, `OWN_GIG`, `ANSWER_REQUIRED`, `ANSWER_TOO_LONG`, `ANSWER_INVALID`, duplicate key (already applied).
- After applying, the applicant sees their own submitted message and answers on the gig page.
- **Poster's applicants screen:** list applicants with profile (name, username, university, bio, avatar via `profiles`), contact details, message and each question with its answer; change `status` (`submitted, reviewing, shortlisted, accepted, rejected`) with `PATCH applications`; export CSV. Only the poster (and admins) can read these rows; RLS enforces it.

### Custom questions (used by gigs, events, clubs)
A question is `{ "id": string, "label": string, "type": "text" | "long" | "choice" | "yesno", "required": boolean, "options": [string] (choice only) }`; up to 8 per item. Answers are a JSON object `{ "<question id>": "<string>" }` (yes/no are `"yes"`/`"no"`). Build one reusable `QuestionBuilder` (creator) and `AnswerForm` / `AnswersView` (respondent / reader) composables.

### Creating content
- Users post gigs (`gigs` insert) and events (`events` insert) with `status = 'pending'`; an admin approves. Set `posted_by_user_id = auth uid`. Compensation options: Paid, Unpaid, Equity, Paid + equity, Profit share, Negotiable. Tags: pick from the fixed list in `options.js` (max 4). Event types: Hackathon, Workshop, Meetup, Conference, Networking, Competition, Social, Other. Location via Google Places Autocomplete (same API key restrictions as the website; if unavailable, allow typed text, which will not show as a map pin).
- "My submissions" screen listing the user's own pending/approved/rejected gigs, events and groups.

### Notifications
- `notifications (id, user_id, type, title, body, link, data jsonb, read_at, created_at)`, created by database triggers. Load the latest 50, mark read with `PATCH ... read_at`, RPC `mark_all_notifications_read()`. Realtime subscription on INSERT for the user is optional but nice (also fire a local Android notification while the app is open).
- **Translate them:** rebuild the text from `type` + `data` exactly as `notificationText()` in `notificationMeta.js` does; fall back to `title/body` when `data` is empty.
- Preferences: `notification_prefs (user_id, muted_types text[])` with the categories in `NOTIFICATION_CATEGORIES`. A settings screen toggles them (upsert own row).
- Deep links: `link` values are website paths like `/events/<id>`, `/gigs/<id>/applicants`, `/clubs/<id>`; map them to app destinations.

### Other
- `saved_items (user_id, kind, item_id)` for saving events/gigs/clubs; `reports (reporter_id, kind, item_id, reason, details)` for reporting (reasons: spam, scam, inappropriate, wrong_info, other).
- **Admin screens** (visible only when RPC `is_admin()` is true): review queues for gigs, events, groups (approve/reject, plus "show private links"), reports, moderators, people, activity. Keep it functional, not fancy.
- **Moderator screen** for clubs the user moderates: join requests (with the applicant's profile, message and answers), members, questions editor, activity log.
- Discord linking: the website has a "Connect Discord" flow (`connect_codes`, RPC `redeem_discord_connect_code(p_code)`); reuse it in Account settings.

---

## 5. Navigation and screens

Bottom navigation (4 tabs + Create): **Home, Recruit (gigs), Create (+), Discover (map + events), Clubs**; Settings and Profile in the top bar. Screens: Landing/onboarding, Auth (sign in, sign up, reset, Google), Onboarding steps, Home (personal "your home": tickets, clubs, applications, saved), Explore feed, Event detail, Gig detail, Club detail, Applicants, Organizer dashboard, Scanner, Tickets list, Activity/notifications, Notification settings, Profile (own + public), Account, My submissions, Create (Gig, Event, Group tabs), Appearance/language, Admin, Moderator, About, Terms, Privacy.

Discover uses Google Maps Compose with pins from `lat`/`lng` of approved upcoming events; tapping opens the event. Location text elsewhere is a link to open Google Maps.

---

## 6. Design

- Brand: **Circosodal**. Default look is dark black with electric blue: background `#04060F`, surface `#0A0F1E`, primary `#3D8BFF`, tertiary/accent `#5CE1FF`, error pink `#FF3DA5`. Other palettes: Ultraviolet (`#B26BFF`), Acid (`#7CFF3D`), Paper (light, `#F4F7FF` with cobalt `#1F4FFF`). A theme picker (Appearance) switches palettes; follow system dark/light only for the Paper option.
- Plain, modern Material 3: rounded shapes (`~12-20dp`), smooth outlined icons, generous spacing, clear hierarchy, clean type (Inter or system; Noto Sans Arabic for Arabic). Optional "Pixel" style is out of scope for the app.
- Empty, loading and error states on every list; skeletons or a simple progress indicator; retry buttons. Respect font scaling and TalkBack (`contentDescription` on every icon button).

## 7. Localization and RTL

- All UI text in `strings.xml` (default English) with `values-ar/strings.xml` for Arabic. **No hard-coded UI strings.** Use the website's Arabic dictionary (`src/i18n/ar*.js`, keys are the English text) as the source for translations where the wording matches.
- Enable RTL (`android:supportsRtl="true"`); use `start/end` not `left/right`; mirror directional icons (`AutoMirrored` icon variants). Numbers stay Western digits (locale `ar-QA-u-nu-latn`).
- In-app language switch (English / العربية) that persists (use `AppCompatDelegate.setApplicationLocales` / per-app language).

## 8. Security and quality bar

- Never log tokens, keys, or personal data. No secrets in the repo (`local.properties`, `.env` ignored; provide `local.properties.example`).
- Validate input on the client but rely on RLS/triggers for enforcement; show the server's error codes as friendly messages.
- `ProGuard/R8` rules must keep the JSON models. Use Kotlin serialization or Moshi codegen consistently.
- Remove dead code, the Firebase AI / App Check dependencies if unused, and anything still referencing the old `users` table, `password`, `InitialData`, or `VlsonneRepository` seed logic. The app name and package labels must say Circosodal (some files still say "Vlsonne").
- Keep `minSdk 24`. The project must build with `./gradlew assembleDebug` and pass `./gradlew lint` with no errors.

## 9. Deliverable and order of work

Work in this order and keep the app compiling after each step:
1. Networking layer, session storage, config, error mapping.
2. Auth + onboarding + profile; delete the old `users`/password code.
3. Clubs (private request flow, questions, links via RPC), memberships.
4. Events (feed, detail, RSVP with questions, tickets + QR, organizer dashboard, scanner).
5. Gigs (feed, detail, apply with questions, applicant's own view, poster's applicants screen).
6. Create tabs (gig, event, group) with question builder + My submissions.
7. Notifications (list, translated text, preferences, deep links), saved items, reports.
8. Admin and moderator screens.
9. Theme palettes, English/Arabic + RTL, polish, empty/error states.
10. Cleanup and README (build steps, required BuildConfig keys, what the app expects from the database).

At the end, give me: a list of the files you added/changed/deleted, every assumption you made about the database, anything from this brief you could not do, and the exact commands to build and run. Do not leave TODO stubs in shipped screens.
