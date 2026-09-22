# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh


## Discord bot

The Discord bot lives in its own project: `../../discord-bot` (it must run as a long-lived process, not on Vercel). Run `supabase/migrations/008_discord_and_startups.sql` before deploying the site: the Account and Profile pages read `discord_links` and `profiles.discoverable`.

## Database setup order

Run in the Supabase SQL editor, in order: `schema.sql`, then migrations `002` … `017` (`008` is only needed for the Discord bot; `010` removes free joining of clubs, adds usernames, user-made groups and location columns; `011` notifications; `012` QR tickets, saves, reports, applicants; `013` custom questions and answers, notification preferences, event reminders; `014` the Receipts section (shown as "Career Book" in the code, renamed on-screen since) — entries, profile views, looking-for; `015` gig time commitment, event cost, club eligibility, and extends `create_group()` with a 12th argument — old cached clients still work, they just don't set that field; `016` gig cover photos and club banner photos; `017` drops the "Aura" score entirely and adds the identity-word columns instead).

## Gemini Edge Functions

Two features call Gemini from a Supabase Edge Function, never from the browser — the API key only ever lives on the function. Both fail with a plain error message rather than crashing if undeployed, so the rest of the site works fine without them:

- **Import from CV** (`supabase/functions/parse-cv`): reads an uploaded CV, proposes Receipts entries for the person to review before anything is saved.
- **Find your word** (`supabase/functions/identity-word`): answers to a few short questions come back as one word for the profile banner, plus a short note on why.

To turn either on:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/) (the free tier is enough at this project's scale — Flash Lite over Flash: same token quota, a much higher daily request cap).
2. `npx supabase login`, then `npx supabase link --project-ref <your-project-ref>` (find the ref in the Supabase dashboard's project URL or Settings > General) from this folder.
3. `npx supabase secrets set GEMINI_API_KEY=<your key>` — one key, shared by both functions (and `GEMINI_MODEL=<exact model id>` only if the default in either function's `index.ts` is no longer current — Google AI Studio's own code sample for whichever model you pick shows the exact id string to use).
4. `npx supabase functions deploy parse-cv` and `npx supabase functions deploy identity-word`.

Languages: English and Arabic (right-to-left). Strings are written in English and passed through `t('...')`; the Arabic dictionary is `src/i18n/ar*.js`. A missing entry simply shows English.

Google sign-in: enable the Google provider in Supabase (Auth > Providers) with an OAuth Web client, and add the site URL to Supabase redirect URLs. Location search needs "Places API (New)" enabled on `VITE_GOOGLE_MAPS_API_KEY`.
