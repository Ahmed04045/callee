# Contributing

This project is released under the [MIT License](./LICENSE). The original creator is no longer actively developing it, and another student is welcome to carry it forward. Forks are encouraged; ongoing maintenance and prompt pull-request reviews are not promised. Read the [creator's note and migration guide](./README.md) for the project's background and setup details.

Follow [README.md](./README.md) to configure your own Supabase project, apply the SQL files in order, and start the app. Copy `.env.example` to `.env.local` and use your own public credentials. Do not use production data for development.

Before opening a pull request:

- Explain the problem, the resulting behavior, and how you checked it.
- Run `npm run build`, `npm run lint`, and `npm test`. The existing lint backlog is not yet clean; avoid introducing new findings in changed code.
- Check English and Arabic, mobile and desktop, and both visual styles. Language changes must preserve navigation positions and control order.
- Use `t()` for interface copy and add Arabic translations in `src/i18n/ar*.js`.
- Use theme tokens and existing components where possible.
- For database changes, add a numbered migration, document its setup, and enforce authorization in RLS or a server-side function. Client-side visibility is not authorization.
- Never commit credentials, personal data, real tickets, `.env.local`, or service-role keys. `VITE_*` values are bundled into the public frontend.

For a suspected security issue, do not include secrets, ticket codes, or personal data in a public issue. Maintainers should establish a private security contact before the public release.

## Before the public release

Before launching your own instance, publish a security contact, review repository history for secrets, and arrange a native-speaker review of the Arabic copy. The MIT license is included in `LICENSE`; keep its notice when reusing the code.

## Useful next features

- **Ticket email:** send from a server-side worker after a successful RSVP, using a configured email provider and verified sender. Resolve the recipient from the authenticated account; never accept an arbitrary recipient or ticket from the browser. Add retry/idempotency tracking and rate limits, and make sure mail failure cannot undo an RSVP. Attach a locally generated QR image rather than sending ticket codes to an external QR service. This is not implemented yet.
- **Event end times and timezones:** the current schema stores a date and optional Qatar local start time. Add explicit duration/timezone fields before expanding to other countries.
- **Account deletion:** design a server-side flow that also handles owned events/groups, storage files, and application records.
- **Integration coverage:** exercise RSVP capacity, ownership/RLS, check-in, and membership approval in an isolated Supabase test project.
