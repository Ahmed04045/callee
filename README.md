# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh


## Discord bot

The Discord bot lives in its own project: `../../discord-bot` (it must run as a long-lived process, not on Vercel). Run `supabase/migrations/008_discord_and_startups.sql` before deploying the site: the Account and Profile pages read `discord_links` and `profiles.discoverable`.

## Database setup order

Run in the Supabase SQL editor, in order: `schema.sql`, then migrations `002` … `016` (`008` is only needed for the Discord bot; `010` removes free joining of clubs, adds usernames, user-made groups and location columns; `011` notifications; `012` QR tickets, saves, reports, applicants; `013` custom questions and answers, notification preferences, event reminders; `014` the Career Book — entries, aura, profile views, looking-for; `015` gig time commitment, event cost, club eligibility, and extends `create_group()` with a 12th argument — old cached clients still work, they just don't set that field; `016` gig cover photos and club banner photos).

## Import from CV

Reads an uploaded CV with Gemini and proposes Career Book entries for the person to review before anything is saved — see `supabase/functions/parse-cv/index.ts` for the exact prompt and request shape. This is a separate Edge Function, not a migration; the client fails gracefully (a plain error message, not a crash) if it isn't deployed, so the rest of the site works fine without it. To turn it on:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/) (the free tier is enough at this project's scale — Flash Lite over Flash: same token quota, a much higher daily request cap).
2. `npx supabase login`, then `npx supabase link --project-ref <your-project-ref>` (find the ref in the Supabase dashboard's project URL or Settings > General) from this folder.
3. `npx supabase secrets set GEMINI_API_KEY=<your key>` (and `GEMINI_MODEL=<exact model id>` only if the default in `parse-cv/index.ts` is no longer current — Google AI Studio's own code sample for whichever model you pick shows the exact id string to use).
4. `npx supabase functions deploy parse-cv`.

No client env var or redeploy of the site is needed — the key lives only on the function, never in the browser bundle.

Languages: English and Arabic (right-to-left). Strings are written in English and passed through `t('...')`; the Arabic dictionary is `src/i18n/ar*.js`. A missing entry simply shows English.

Google sign-in: enable the Google provider in Supabase (Auth > Providers) with an OAuth Web client, and add the site URL to Supabase redirect URLs. Location search needs "Places API (New)" enabled on `VITE_GOOGLE_MAPS_API_KEY`.
