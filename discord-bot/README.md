# Circosodal Discord bot

This optional Node.js/discord.js companion brings the community into a Discord server. Students can discover events, gigs and clubs, link their website account, and use early startup collaboration workflows without starting from the website each time. The website remains the place for event RSVPs, gig applications and private club membership flows.

It runs as its own persistent process and uses the same Supabase database as the website. Installing or deploying the root website does not install or start this bot. The package name `povolum-discord-bot` is a historical name.

## Commands in the source

| Command | Purpose |
|---|---|
| `/help` | Show available commands. |
| `/events`, `/gigs`, `/clubs` | Browse public approved listings and follow website links. Private club invitation links are not included. |
| `/connect` | Generate a short-lived code to link a Discord identity to a signed-in website account. |
| `/me` | Show a private summary of the linked account's tickets, applications and notifications. |
| `/search` | Search users who opted into discoverability, or startups. |
| `/create`, `/edit` | Profile/startup creation and editing workflows. |
| `/join`, `/collab` | Startup join requests and collaboration workflows, including interactive buttons/modals. |

## Setup

Use **Node.js 22 or newer**: the committed dependency lockfile includes packages requiring Node 22. Commands below run inside `discord-bot/`.

1. Set up a development Supabase project using the full [root migration guide](../README.md#2-database-setup-supabase-sql-editor). Migration 008 supplies account linking and startup tables, but it is not sufficient by itself: browsing and `/me` also use website tables and later ticket/notification migrations.
2. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications). Obtain its bot token and application/client ID. Invite it to a test server with the `bot` and `applications.commands` scopes and permissions to send messages and embed links. Copy the server ID with Discord Developer Mode enabled.
3. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` in a POSIX shell).
4. Fill in the following values:

   | Variable | Meaning |
   |---|---|
   | `DISCORD_TOKEN` | Secret bot token. |
   | `DISCORD_CLIENT_ID` | Discord application ID. |
   | `DISCORD_GUILD_ID` | Test server ID; command registration targets this server. |
   | `SUPABASE_URL` | Your shared development Supabase URL. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-only service-role key. This bypasses RLS; the bot's own ownership checks are important. Never put it in the website or Android app. |
   | `SITE_URL` | Your website origin, used in account-linking and listing URLs. Defaults to `https://callee-sooty.vercel.app`; change it to your own website when using your own database. |

5. Install dependencies and start:

   ```sh
   npm ci
   npm run deploy-commands
   npm start
   ```

   `deploy-commands` writes the slash-command definitions to your configured Discord server. Run it again when command definitions change. `npm start` connects to Discord and stays running until stopped. In PowerShell environments that block `npm.ps1`, use `npm.cmd`.

## Account linking and deployment

Use `/connect` in the test server, then follow its link to your website and redeem the code while signed in. Enable discoverability in the website profile editor if you want that profile returned by `/search user`.

Deploy the folder to a host that supports a persistent Node process and Discord gateway connections, with the same environment variables and `npm start` as its start command. Configure process restarts through the host. This is separate from the website's Vercel deployment. Keep command registration as a deliberate setup step rather than running it on every restart.

## Known limitations and checks

- `/collab` and `/edit startup` currently assume a single owned startup; multi-startup workflows need more work.
- Collaboration handlers refer to the generated `startup_collaborations_target_startup_id_fkey` relationship name. Verify it against your database when testing accept/decline flows.
- Startup tables and the mobile prototype represent earlier project work; not every workflow has website/mobile parity.
- No live Discord/Supabase integration test was performed during this repository import. Test account linking, private replies, ownership checks and collaboration buttons in your own test server before inviting a wider community.
- Root website lint/build commands do not validate this package. You can check each source file with `node --check path/to/file.js`; this validates syntax, not runtime behavior.

The source is provided under the repository's [MIT License](../LICENSE). Dependencies retain their own licenses. Credentials, installed dependencies and runtime data are not included.
