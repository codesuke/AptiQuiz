# Slice #15: Sign up, sign in, and sign out with email and password

- Parent PRD: [#1](https://github.com/codesuke/AptiQuiz/issues/1) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/15
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met, according to the final closing comment. The first comment recorded that PostgreSQL was unreachable; the second comment records the migration deploy and the live flow against the configured PostgreSQL server. Verification email and password reset UI were scoped to #16 and #17.

## Implementation summary

- Better Auth email-and-password sign-up, sign-in, and sign-out at `/api/auth/*` with the Prisma adapter on PostgreSQL.
- Prisma-generated initial migration (`Apti-App/packages/database/prisma/migrations/20261010060000_initial_auth/`) adds the Better Auth models and the User suspended flag, and replaces Question Set and Room token hashes with User ids.
- Guest and signed-in header states, generic credential error, accessible auth form states based on the auth mock kit.
- Injectable mail sender (`Apti-App/apps/web/src/lib/mail-sender.ts`): Nodemailer over Gmail SMTP, console sender without credentials in development.

## Verification evidence

- `prisma migrate deploy` against the configured PostgreSQL server.
- Web typecheck, focused mail-sender tests (3 passing), Biome, production `next build`.
- Live auth flow: sign-up, signed-in header, sign-out, Guest header, invalid credentials.
- Rate limiting: repeated invalid sign-ins return `429`.
- Production client asset scan: no database URL or configured secret.

## Authorship

- Commit on `main`: `2524e16` by Codesuke <codesuke@gmail.com>. The checkpoint commits named in the issue comments are not on `main`; the slice content (for example the files it names) is on `main` in `2524e16` (feat: add authentication, deployment, and documentation).
- No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#15](https://github.com/codesuke/AptiQuiz/issues/15)
- State at archive time: CLOSED (closed 2026-10-10)
- Labels: ready-for-agent

### Parent

#1

### Slice type

Vertical

### What to build

A visitor can create a User account with display name, email, and password, sign in, and sign out. The foundation page header shows "Sign in" for a Guest and the User's name with "Sign out" for a User.

Better Auth runs in the web app at `/api/auth/*` with its Prisma adapter. Its User, Session, Account, and Verification models are added to the Prisma schema, and the first Prisma migration is generated. The same migration replaces Question Set `ownerTokenHash` with an owning User id and Room `hostTokenHash` with a hosting User id (no data exists yet). The User model includes a suspended flag (enforced in a later slice).

Pages follow the layout and states of `design-mocks/auth-kit` (shared auth layout, loading and generic error states) using AptiQuiz branding from `DESIGN.md` — replace the other product's logo and caption, omit the Microsoft button.

This slice also provides the injected mail sender used by the verification and reset slices: Nodemailer over Gmail SMTP (`GMAIL_USER`, `GMAIL_APP_PASSWORD`), falling back to a console sender that logs links when the credentials are missing in development.

### Acceptance criteria

- [ ] A visitor can sign up with display name, email, and password (8–128 characters) and lands signed in.
- [ ] A User can sign out and sign back in with the same credentials; wrong credentials show a generic error.
- [ ] The header reflects Guest vs signed-in state.
- [ ] Sign-in and sign-up requests are rate-limited.
- [ ] The Prisma migration is generated through Prisma and applies cleanly to an empty database; Question Set and Room reference User ids instead of token hashes.
- [ ] The mail sender is injectable; without Gmail credentials it logs messages to the web server log.
- [ ] Auth pages are keyboard usable, have visible labels and focus, use 44px minimum controls, disable duplicate submissions while busy, and work on a 360px-wide screen.
- [ ] No auth secret or `DATABASE_URL` appears in client bundles; browser modules do not import `@aptiquiz/database`.

### Issue comments

#### codesuke, 2026-10-10 06:17 UTC

Implementation is committed in 0b609b5, 57554eb, and 641454a. Verified: Prisma schema validation, web TypeScript check, mail-sender tests (3 passing), production Next.js build, and browser-bundle scan for auth secrets/database imports. The migration was generated with Prisma.

Verification limitation: no PostgreSQL server is reachable in this environment (localhost:5432 does not respond), so I could not apply the migration to an empty database or complete an end-to-end sign-up/sign-in session. The slice remains open until that database-backed check runs.

#### codesuke, 2026-10-10 06:27 UTC

Completed in the email/password auth slice.

- Added Better Auth email/password signup, sign-in, and sign-out with a PostgreSQL Prisma adapter.
- Added the generated PostgreSQL migration and deployed it successfully to the configured database.
- Added signed-in and guest header states, generic credential failure handling, accessible form states, and a development-safe Gmail mail sender.
- Scoped verification and password reset UI/configuration to their dedicated slices (#16 and #17).

Verified with the configured PostgreSQL service:

- `prisma migrate deploy`
- web typecheck, focused mail sender tests, Biome, and a production `next build`
- live auth flow: signup, signed-in header, sign-out, guest header, and invalid credentials
- rate limiting: repeated invalid sign-ins return `429`
- production client asset scan: no database URL or configured secrets emitted
