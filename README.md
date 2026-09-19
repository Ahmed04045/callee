# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh


## Discord bot

The Discord bot lives in its own project: `../../discord-bot` (it must run as a long-lived process, not on Vercel). Run `supabase/migrations/008_discord_and_startups.sql` before deploying the site: the Account and Profile pages read `discord_links` and `profiles.discoverable`.
