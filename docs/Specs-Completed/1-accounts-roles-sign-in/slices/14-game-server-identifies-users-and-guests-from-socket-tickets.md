# Slice #14: Game Server identifies Users and Guests from Socket Tickets

- Parent PRD: [#1](https://github.com/codesuke/AptiQuiz/issues/1) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/14
- Slice type: Horizontal (verified through tests; the browser side landed in #20)
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met, according to the closing comment: ticket verification with distinct reasons, User and Guest identity in `server:ready`, `socket_ticket_expired` and `socket_ticket_invalid` refusals, required `GAME_SERVER_SECRET`, in-process handshake tests, and simulator Guests.

## Implementation summary

- New `@aptiquiz/socket-ticket` package: `issueSocketTicket(subject, secret, now)` and `verifySocketTicket(ticket, secret, now)`. HS256 JWT (jose), injected time, 60 s lifetime, audience `aptiquiz-game-server`. Reasons: `expired`, `tampered`, `wrong_audience`, `malformed`.
- `@aptiquiz/contracts` adds the ticket subject and claims schemas, handshake auth schema, `socketHandshakeErrorCodeSchema`, and `connectionIdentitySchema`. `server:ready` carries `identity`.
- Game Server Socket.IO middleware (`Apti-App/apps/game-server/src/handshake.ts`): no ticket is a Guest, a valid ticket is a User, a bad ticket is refused and never downgraded.
- `readGameServerConfig` requires `GAME_SERVER_SECRET` (at least 32 characters). `dev` and `start` load `Apti-App/.env` if it exists.
- Limitation recorded at close: the client receives the error code as the `connect_error` message string; parsing it with `socketHandshakeErrorCodeSchema` was left to the browser.

## Verification evidence

- socket-ticket: 9/9 tests (valid, expired, wrong secret, altered claims, wrong audience, 3 malformed inputs, invalid claims).
- game-server: 13/13 tests, in-process Socket.IO handshake with `socket.io-client` (User, Guest, expired, wrong secret, altered, wrong audience, malformed, empty and non-string tickets, config refusal).
- `turbo typecheck test build` 15/15 for contracts, socket-ticket, game-engine, game-server, and simulator; `biome check .` clean.
- The built server refused to start without a secret. With a secret, `pnpm simulate` connected 50/50 Guests (median 12 ms, p95 14 ms).

## Authorship

- Commit on `main`: `2524e16` by Codesuke <codesuke@gmail.com>. The checkpoint commits named in the issue comments are not on `main`; the slice content (for example the files it names) is on `main` in `2524e16` (feat: add authentication, deployment, and documentation).
- No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#14](https://github.com/codesuke/AptiQuiz/issues/14)
- State at archive time: CLOSED (closed 2026-10-10)
- Labels: ready-for-agent

### Parent

#1

### Slice type

Horizontal — verifiable through tests; the browser side lands in a later slice.

### What to build

The Game Server learns who is connecting. A connection that presents a valid Socket Ticket in the Socket.IO handshake is identified as that User; a connection with no ticket is a Guest. `server:ready` reports the identity. Bad tickets are refused with a typed error and are never silently downgraded to a Guest.

Introduce a shared `@aptiquiz/socket-ticket` package exporting `issueSocketTicket(claims, secret, now)` and `verifySocketTicket(ticket, secret, now)` (HS256 JWT, time injected). The claims schema and handshake error codes live in `@aptiquiz/contracts`. Claims: User id, role, Home College id (nullable), email-verified status, issued-at, expiry (60 s), and an audience naming the Game Server.

### Acceptance criteria

- [ ] `verifySocketTicket` accepts a valid ticket and rejects expired, tampered, wrong-audience, and malformed tickets, each with a distinguishable reason.
- [ ] A connection with a valid ticket receives `server:ready` containing its User id, role, and verified status.
- [ ] A connection with no ticket receives `server:ready` identifying it as a Guest.
- [ ] A connection with an expired ticket is refused with `socket_ticket_expired`.
- [ ] A connection with an altered, wrong-audience, or malformed ticket is refused with `socket_ticket_invalid`.
- [ ] The Game Server reads `GAME_SERVER_SECRET` through its config and refuses to start without it.
- [ ] Handshake behavior is covered by in-process Socket.IO tests in the style of the existing Game Server tests.
- [ ] The existing simulator still connects as Guests.

### Issue comments

#### codesuke, 2026-10-10 06:09 UTC

Implemented on local `main` in 0b609b5 (checkpoint that captured the slice) and 262e631 (review fixes). **Not pushed yet**; `main` also carries in-progress #15 checkpoints.

**What shipped**
- New `@aptiquiz/socket-ticket` package: `issueSocketTicket(subject, secret, now)` and `verifySocketTicket(ticket, secret, now)`. Tickets are HS256 JWTs (jose) with time injected, a 60 s lifetime enforced by `exp` and `maxTokenAge`, and audience `aptiquiz-game-server`. Rejection reasons: `expired`, `tampered`, `wrong_audience`, `malformed`.
- `@aptiquiz/contracts` adds the ticket subject and claims schemas, handshake auth schema, `socketHandshakeErrorCodeSchema` (`socket_ticket_expired`, `socket_ticket_invalid`), and `connectionIdentitySchema`. `server:ready` now carries `identity`.
- The Game Server runs a Socket.IO middleware (`apps/game-server/src/handshake.ts`). No ticket means a Guest. A valid ticket means a User (id, role, verified). Bad tickets are refused and never downgraded to a Guest.
- `readGameServerConfig` requires `GAME_SERVER_SECRET` (at least 32 characters). The `dev` and `start` commands load `Apti-App/.env` if it exists.

**Verification**
- socket-ticket: 9/9 tests (valid, expired, wrong secret, altered claims, wrong audience, 3 malformed inputs, invalid claims).
- game-server: 13/13 tests, in-process Socket.IO handshake with `socket.io-client`: User, Guest, expired, wrong secret, altered, wrong audience, malformed, empty and non-string tickets, plus config refusal.
- `turbo typecheck test build` passed 15/15 for contracts, socket-ticket, game-engine, game-server and simulator. `biome check .` is clean.
- The built server with no secret refuses to start. With a secret, `pnpm simulate` connected 50/50 Guests (median 12 ms, p95 14 ms).

**Known limitations**
- The client receives the error code as the `connect_error` message string. #20 should parse it with `socketHandshakeErrorCodeSchema`.
- The full `pnpm check` currently fails in `@aptiquiz/web` typecheck and `@aptiquiz/database` build. Both come from the uncommitted #15 work in progress, not this slice.
