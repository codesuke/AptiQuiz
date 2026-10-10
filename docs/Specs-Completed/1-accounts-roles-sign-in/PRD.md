# PRD #1: Accounts, Roles & Sign-in

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/1
- Archived: 2026-10-10
- Status: all slices implemented, verified, and closed. The PRD issue was still open at archive time.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#14](https://github.com/codesuke/AptiQuiz/issues/14) | Game Server identifies Users and Guests from Socket Tickets | Horizontal | [slice](slices/14-game-server-identifies-users-and-guests-from-socket-tickets.md) |
| [#15](https://github.com/codesuke/AptiQuiz/issues/15) | Sign up, sign in, and sign out with email and password | Vertical | [slice](slices/15-sign-up-sign-in-and-sign-out-with-email-and-password.md) |
| [#16](https://github.com/codesuke/AptiQuiz/issues/16) | Email verification | Vertical | [slice](slices/16-email-verification.md) |
| [#17](https://github.com/codesuke/AptiQuiz/issues/17) | Password reset | Vertical | [slice](slices/17-password-reset.md) |
| [#18](https://github.com/codesuke/AptiQuiz/issues/18) | Sign in with Google | Vertical | [slice](slices/18-sign-in-with-google.md) |
| [#19](https://github.com/codesuke/AptiQuiz/issues/19) | Admin role and suspension | Vertical | [slice](slices/19-admin-role-and-suspension.md) |
| [#20](https://github.com/codesuke/AptiQuiz/issues/20) | Signed-in browser connects to the Game Server as its User | Vertical | [slice](slices/20-signed-in-browser-connects-to-the-game-server-as-its-user.md) |

## Build summary

- A visitor can sign up with display name, email, and password, sign in, and sign out (Better Auth at `/api/auth/*`, Prisma adapter on PostgreSQL). The header shows Guest or signed-in state.
- Sign-up sends a verification email. A signed-in unverified User sees a notice with a rate-limited resend action on the home page. Verification gates nothing yet.
- Password reset: request, inbox confirmation, reset form, success, expired-link page. Unknown and known emails get the same response. A reset ends other sessions and marks the email verified.
- "Continue with Google" signs in or creates a User when Google credentials are configured.
- Admin access is derived on each request from a verified email and the current `ADMIN_EMAILS` list. `/admin` is a placeholder guard. Suspended Users cannot sign in and their sessions stop working on the next request.
- `@aptiquiz/socket-ticket` signs and verifies 60-second HS256 Socket Tickets. `POST /api/socket-ticket` issues them (401 without session, 403 when suspended). The browser requests a fresh ticket for every connection attempt. The Game Server identifies User and Guest connections and refuses bad tickets with `socket_ticket_expired` or `socket_ticket_invalid`.
- Question Set and Room reference owning and hosting User ids instead of token hashes (initial Prisma migration).
- In development without Gmail credentials, verification and reset emails are written to the web server log.

### Approved spec change

Accepted by the project owner on #18 and recorded on #1: Google sign-in links to an existing password User only when that User's email is verified. A completed password reset verifies the email, so the real owner of a pre-registered address can recover it and then link Google. This narrows the acceptance criterion "Signing in with Google using the email of an existing password account opens the same User" to verified accounts. Reason: linking without the check would let someone register another person's email with a password they choose and take over that person's later Google sign-in.

## Verification summary

Evidence is taken from the slice closing comments; see each slice file for detail.

- `@aptiquiz/socket-ticket` 9/9 tests and Game Server 13/13 in-process handshake tests (#14). `pnpm simulate` connected 50/50 Guests.
- Prisma migration deployed to the configured PostgreSQL server; live sign-up, sign-in, sign-out, invalid credentials, and `429` rate limiting (#15).
- Live `/admin` check against PostgreSQL for Guest, unverified allow-listed User, verified Admin, non-Admin, and suspended session (#19).
- Live Chromium check of Guest and User identities in `GameServerStatus`, and reconnect with a newly issued ticket after ticket expiry and Game Server restart (#20).
- Final checks after #16, #17, #18: `biome check` clean, `pnpm typecheck` 7/7, `pnpm test` 11/11 tasks (web 45 tests, including database-backed auth tests), `pnpm build` 7/7. `code-review` (Standards and Spec) findings fixed in `eea2d65` and `dc9410f`.
- Client bundle and tracked-file scans found no configured secret or database URL (#15, #18, #20).
- Not verified: a real Google consent-and-callback round trip (no local Google credentials). Covered by an integration test with a stubbed Google token endpoint.

## Authorship

Derived from commit authors on `main`. No commit carries a `Co-authored-by` trailer.

- Codesuke <codesuke@gmail.com>: `2524e16` (contains #14, #15, and the first #19 work; the checkpoint commits `0b609b5`, `262e631`, `57554eb`, `641454a`, and `d89c510` named in issue comments are not on `main`), `1eba2a3` (#18), `059315d` (#16), `ebd8fce` (#17), `6aba7a6`, `eea2d65`, `dc9410f`.
- OpenAI Codex <codex@openai.com>: `6c0daaf` (#19 allow-list fix), `0595127` (#20).

## Follow-ups

- The verification notice is rendered on the home page only. Other pages need it when they exist.
- No real Google OAuth round trip was verified locally.
- Rate limiting uses Better Auth's in-memory store. It is correct only for one web server process.
- Google OAuth redirect URIs for the production domain belong to the Dokploy Deployment PRD (#11).
- The shared `Apti-App/.env` at one point had `GMAIL_USER` set with an empty `GMAIL_APP_PASSWORD`. The mail sender then throws "GMAIL_USER and GMAIL_APP_PASSWORD must be set together". Set both values or neither.
- The browser does not yet parse the Game Server `connect_error` message with `socketHandshakeErrorCodeSchema` (noted on #14).
- The `/admin` "Not allowed" page returns HTTP 200 (noted on #19).

## Issue snapshot

- Issue: [#1](https://github.com/codesuke/AptiQuiz/issues/1)
- State at archive time: OPEN
- Labels: ready-for-agent

### Problem statement

College League points must belong to real, verified people. Hosting and Question Set ownership need a stable owner. At a live event, a student must still be able to join a Room in seconds without an account. The Game Server runs on a separate origin, so it cannot read web sign-in cookies. Today the application has no identity: anyone can do anything, and the schema uses anonymous owner and host token hashes.

### Outcome

A visitor can create a User account with email and password or with Google, verify their email, reset a forgotten password, sign in, and sign out. Admins are recognized from `ADMIN_EMAILS`. A suspended User is locked out. A signed-in browser gets a Socket Ticket, and the Game Server identifies that connection as the User. A browser without a ticket connects as a Guest.

### User stories

1. As a student, I want to sign up with email and password or Google, so that my results can count for my College.
2. As a new User, I want a verification email and a way to resend it, so that I can become eligible for College League points.
3. As a User who forgot my password, I want a reset email, so that I can get back into my account.
4. As a Guest at a college event, I want to connect without an account, so that I can play immediately.
5. As an Admin, I want Admin access from my verified email alone, so that no setup screen is needed.
6. As the Game Server, I want a short-lived signed Socket Ticket for each signed-in User, so that I can trust identity without reading cookies or the database.

### Requirements

#### Roles

- Three roles: Guest (no account), User, Admin.
- A User is an Admin only when their email is in `ADMIN_EMAILS` **and** the email is verified. The role is computed at request time and is not stored, so removing an email from the list removes Admin access on the next request.
- Comparison with `ADMIN_EMAILS` is case-insensitive and trims whitespace. The list is comma-separated.
- An unverified User can play and host. Only a verified User is eligible for College League points (enforced in the College League PRD, #8).

#### Accounts

- Sign up with display name, email, and password. Password length: 8 to 128 characters.
- Sign in with email and password, or with Google.
- If a Google sign-in uses the email of an existing email-and-password account, the accounts link to one User. A Google account counts as verified.
- Sign out ends the current session.
- Email verification: a link is sent on sign-up. A signed-in unverified User sees a persistent notice with a "Resend verification email" action.
- Password reset: request by email, follow the link, set a new password. The request response does not reveal whether the email has an account. An expired or used link shows an expired-link state with a way to request a new link. A successful reset ends the User's other sessions.
- Repeated sign-in, sign-up, and reset requests are rate-limited.

#### Suspension

- A User has a suspended state. A suspended User cannot sign in, cannot get a Socket Ticket, and existing sessions stop working on the next request.
- This PRD adds the state and its enforcement only. The Admin action that suspends a User belongs to the Admin Console PRD (#9).

#### Socket Tickets

- `apps/web` issues a Socket Ticket to a signed-in, non-suspended User. Lifetime: 60 seconds. Signed with `GAME_SERVER_SECRET`.
- Claims: User id, role, Home College id (nullable until the Colleges PRD, #2, sets it), email-verified status, issued-at, expiry, and an audience that names the Game Server.
- The browser requests a fresh ticket for every Game Server connection attempt, including automatic reconnects.
- The Game Server reads the ticket from the Socket.IO handshake `auth` payload:
  - Valid ticket: the connection is identified as that User. `server:ready` includes the identity (User id, role, verified status).
  - No ticket: the connection is a Guest. `server:ready` reports the Guest identity.
  - Expired, tampered, wrong-audience, or malformed ticket: the connection is refused with a typed error code (`socket_ticket_expired` or `socket_ticket_invalid`). It is never silently downgraded to a Guest.

#### Ownership

- Question Set ownership changes from `ownerTokenHash` to an owning User id.
- Room host identity changes from `hostTokenHash` to a hosting User id.
- No data migration is needed: no product flow writes these tables yet.

#### Pages

- Sign in, sign up, forgot password, reset password, email confirmation, reset success, and expired link pages.
- The foundation page header shows "Sign in" for a Guest and the User's name with "Sign out" for a User.
- An Admin-only area at `/admin` exists as a placeholder. A non-Admin User gets a "not allowed" response. A Guest is redirected to sign in.

### Acceptance criteria

- [ ] A visitor can sign up with email and password, receives a verification email, and is verified after following the link.
- [ ] An unverified User sees the verification notice and can resend the email.
- [ ] A visitor can sign in with Google. Signing in with Google using the email of an existing password account opens the same User.
- [ ] A User can request a password reset, follow the link, set a new password, and sign in with it. The old password stops working.
- [ ] A password reset request for an unknown email shows the same confirmation as for a known email.
- [ ] An expired reset link shows the expired-link page with a "Request a new link" action.
- [ ] A verified User whose email is in `ADMIN_EMAILS` can open `/admin`. A non-Admin User gets "not allowed". A Guest is redirected to sign in.
- [ ] An unverified User whose email is in `ADMIN_EMAILS` does **not** get Admin access.
- [ ] A suspended User cannot sign in, and a suspended User's existing session cannot get a Socket Ticket.
- [ ] A signed-in browser connects to the Game Server and `server:ready` reports its User id and role.
- [ ] A browser with no ticket connects and `server:ready` reports a Guest.
- [ ] A connection with an expired ticket is refused with `socket_ticket_expired`. A connection with an altered or wrong-audience ticket is refused with `socket_ticket_invalid`.
- [ ] Without Gmail credentials in local development, verification and reset links are written to the web server log, and the flows still work.
- [ ] No secret (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `GMAIL_APP_PASSWORD`, `GAME_SERVER_SECRET`, `DATABASE_URL`) appears in client bundles or committed files.
- [ ] Auth pages are keyboard usable, have visible labels and focus, use 44px minimum controls, and work on a 360px-wide screen.

### Implementation decisions

- Decision: Better Auth in `apps/web`, mounted at `/api/auth/*`, with its Prisma adapter on PostgreSQL. Its User, Session, Account, and Verification models go into `packages/database/prisma/schema.prisma`, and the migration is generated with Prisma.
  - Rationale: one library covers email and password, verification, reset, Google OAuth, account linking, and rate limiting. See ADR 0007.
- Decision: Admin role is derived from `ADMIN_EMAILS` plus verified email at request time, not stored in the database.
  - Rationale: no admin-management UI; a stored role would drift from the list. Requiring verification stops anyone from claiming an Admin email by signing up with it.
- Decision: a new shared package, `@aptiquiz/socket-ticket`, exports `issueSocketTicket(claims, secret, now)` and `verifySocketTicket(ticket, secret, now)`. It uses HS256 JWT. Both functions take the time as input. The claims schema and the typed handshake error codes live in `@aptiquiz/contracts`.
  - Rationale: the web app and the Game Server must agree on one format, and package boundaries forbid cross-package relative imports. Injected time makes expiry testable. The signing code stays out of the browser bundle because `@aptiquiz/contracts` is imported by the browser.
- Decision: `POST /api/socket-ticket` Route Handler issues tickets. It returns 401 with no session and 403 for a suspended User.
  - Rationale: a server-only Route Handler keeps `GAME_SERVER_SECRET` out of the browser.
- Decision: the Game Server checks tickets in a Socket.IO connection middleware and stores the identity in `socket.data`. It reads `GAME_SERVER_SECRET` through `readGameServerConfig` and fails to start without it.
  - Rationale: identity is settled once per connection, before any event handler runs.
- Decision: email goes through Nodemailer over Gmail SMTP with an App Password (`GMAIL_USER`, `GMAIL_APP_PASSWORD`). The mail sender is an injected dependency. When the credentials are missing in development, a console sender logs the links.
  - Rationale: free for hackathon volume (about 500 emails a day); tests and local development need no mailbox.
- Decision: email verification gates League points only, not play or hosting.
  - Rationale: a slow inbox must not block a live match. See ADR 0007.
- Decision: auth pages reuse the layout and states of `design-mocks/auth-kit` with AptiQuiz branding from `DESIGN.md`.
  - Rationale: the kit already defines every state of this flow. It carries another product's logo, caption, and a Microsoft button; replace the logo and caption with AptiQuiz ones and omit Microsoft.

### Testing decisions

- Highest useful public test seam:
  - `@aptiquiz/socket-ticket` through its exported functions: valid, expired, tampered, wrong-audience, and malformed tickets.
  - The Game Server Socket.IO handshake: in-process server plus `socket.io-client`, as in `apps/game-server/src/server.test.ts`. Cover User, Guest, expired, and invalid connections and the identity in `server:ready`.
  - The web app's role and ticket logic (`resolveRole`, the ticket Route Handler) with a stub session: Admin requires verified email, case-insensitive match, suspended User gets 403, no session gets 401.
- Relevant prior tests: `apps/game-server/src/server.test.ts`, `packages/contracts/src/index.test.ts`.
- Behavior that must be verified: everything above, plus one manual end-to-end pass of sign-up, verify, reset, Google sign-in, and `/admin` access against local PostgreSQL. Better Auth internals are not unit tested.

### Dependencies

- None. This PRD is the first feature.
- Google OAuth redirect URIs for the production domain are configured with the Dokploy Deployment PRD (#11).

### Out of scope

- Deliberately excluded: sign-in providers other than Google (including Microsoft, shown in the mock kit), passkeys, multi-factor authentication, account deletion, changing email address, profile editing beyond display name.
- Deferred to other PRDs:
  - Home College selection — Colleges & College Registration (#2).
  - The Admin action that suspends a User, and real Admin pages — Admin Console (#9).
  - League eligibility rules that read verified status — College League (#8).
  - Guest identity inside a Room and Resume Tokens — Rooms & Lobby (#4) and Reconnection & Resume (#6).
  - Server-to-server calls from `apps/web` to the Game Server (Room creation) — Rooms & Lobby (#4). That PRD reuses `GAME_SERVER_SECRET` and `@aptiquiz/socket-ticket` signing for the internal request.
  - College membership checks by email domain.

### Further notes

- Environment variables, all already named in `Apti-App/.env.example`: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ADMIN_EMAILS`, `GAME_SERVER_SECRET`. Do not add others without updating `.env.example` and `Architecture.md`.
- Rotating `GAME_SERVER_SECRET` invalidates outstanding tickets. With a 60-second lifetime and a fresh ticket per connection attempt, the effect is one failed reconnect.
- Update `Architecture.md` (Current Status, Security Rules, Environment Variables, Claims Ledger) when this ships.

### Issue comments

#### codesuke, 2026-10-10 07:30 UTC

Slices #16, #17 and #18 are closed. Spec change accepted for #18: Google sign-in links to an existing password User only when that User's email is verified. A password reset verifies the email, which gives the real owner a path to link. This narrows the acceptance criterion "Signing in with Google using the email of an existing password account opens the same User" to verified accounts. See #18 for the reasoning.
