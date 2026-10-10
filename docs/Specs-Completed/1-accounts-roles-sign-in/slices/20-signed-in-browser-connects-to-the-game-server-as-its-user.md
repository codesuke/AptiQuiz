# Slice #20: Signed-in browser connects to the Game Server as its User

- Parent PRD: [#1](https://github.com/codesuke/AptiQuiz/issues/1) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/20
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met, according to the closing comment.

## Implementation summary

- Server-only `POST /api/socket-ticket` issues a short-lived Socket Ticket from the current session: 401 without a session, 403 for a suspended User.
- The Socket.IO client requests a fresh ticket for each connection attempt, including automatic reconnects. `GameServerStatus` displays the identity from `server:ready`.
- `Architecture.md` updated with the implemented auth flow and verified claims.

## Verification evidence

- `pnpm check` passed (lint, types, tests, production build).
- Live Chromium check against the configured PostgreSQL server: Guest and signed-in User identities shown; automatic reconnection with a different, newly issued ticket after the first ticket expired and the Game Server restarted.
- Production client bundle and tracked files contained no configured secret values.
- Code review found no actionable issues.

## Authorship

- Commit on `main`: `0595127` by OpenAI Codex <codex@openai.com>.
- No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#20](https://github.com/codesuke/AptiQuiz/issues/20)
- State at archive time: CLOSED (closed 2026-10-10)
- Labels: ready-for-agent

### Parent

#1

### Slice type

Vertical

### What to build

A signed-in browser connects to the Game Server as its User; a Guest browser connects as a Guest.

A server-only `POST /api/socket-ticket` Route Handler issues a Socket Ticket for the current session using `@aptiquiz/socket-ticket` and `GAME_SERVER_SECRET`: 401 with no session, 403 for a suspended User. The `GameServerStatus` component requests a fresh ticket for every connection attempt, including automatic reconnects, and shows whether it is connected as a User or a Guest.

Closes out the PRD by updating `Architecture.md` (Current Status, Security Rules, Environment Variables, Claims Ledger) to reflect authentication as implemented.

### Acceptance criteria

- [ ] A signed-in browser's `GameServerStatus` shows the User identity reported by `server:ready`.
- [ ] A Guest browser's `GameServerStatus` shows a Guest identity.
- [ ] `POST /api/socket-ticket` returns 401 without a session and 403 for a suspended User; behavior is tested with stub sessions.
- [ ] After the Game Server restarts, the browser reconnects with a newly issued ticket (no reuse of an expired one).
- [ ] No secret (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `GMAIL_APP_PASSWORD`, `GAME_SERVER_SECRET`, `DATABASE_URL`) appears in client bundles or committed files.
- [ ] `Architecture.md` describes the implemented auth flow and its claims are verified.

### Issue comments

#### codesuke, 2026-10-10 07:18 UTC

Implemented in commit `0595127`.

- The web app issues short-lived, server-signed Socket Tickets from `POST /api/socket-ticket` using the current session state. Guests receive 401; suspended accounts receive 403.
- Socket.IO requests a ticket for each connection attempt. The status view displays the identity supplied by `server:ready`.
- Updated `Architecture.md` with the implemented flow and verified claims.

Verification: `pnpm check` passed (lint, types, tests, production build). A live Chromium check against the configured PostgreSQL server confirmed Guest and signed-in User identities, then confirmed automatic reconnection with a different, newly issued ticket after the first ticket expired and the Game Server restarted. The production client bundle and tracked files contained no configured secret values. Code review found no actionable issues.

The parent PRD remains open for slices #16, #17, and #18.
