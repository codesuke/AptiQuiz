# Slice #19: Admin role and suspension

- Parent PRD: [#1](https://github.com/codesuke/AptiQuiz/issues/1) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/19
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met, according to the closing comment. The "not allowed" page returns HTTP 200 because the slice specified the visible response, not a status code.

## Implementation summary

- `/admin` derives Admin access on each request from a verified User email and the current trimmed, case-insensitive `ADMIN_EMAILS` list. Empty or malformed entries cannot grant access.
- Guests redirect to sign-in; other Users see the "Not allowed" page.
- Better Auth refuses new sessions for suspended Users and rejects their existing sessions on the next auth request. Server-rendered pages recheck the current User row before accepting a session.
- Public `resolveRole` function (`Apti-App/apps/web/src/lib/roles.ts`).

## Verification evidence

- `pnpm check` passed (lint, workspace typecheck, tests, build).
- After the final allow-list fix: focused web tests (7 passing), web typecheck, and Biome passed.
- `resolveRole` stub-session tests; database-backed auth test for suspension.
- Live Next.js check against the configured PostgreSQL server: Guest redirect, unverified allow-listed User denial, verified Admin access, non-Admin denial, suspended-session redirect from `/admin`.

## Authorship

- Commits on `main`: `2524e16` by Codesuke <codesuke@gmail.com> (contains the content of `d89c510`, which the closing comment names and which is not on `main`), and `6c0daaf` (allow-list validation fix) by OpenAI Codex <codex@openai.com>.
- No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#19](https://github.com/codesuke/AptiQuiz/issues/19)
- State at archive time: CLOSED (closed 2026-10-10)
- Labels: ready-for-agent

### Parent

#1

### Slice type

Vertical

### What to build

Admins are recognized and suspended Users are locked out.

A User is an Admin only when their email is in `ADMIN_EMAILS` (comma-separated, case-insensitive, trimmed) **and** their email is verified. The role is computed at request time and never stored, so removing an email from the list removes Admin access on the next request.

A placeholder Admin area at `/admin` proves the guard. A suspended User cannot sign in and existing sessions stop working on the next request. The Admin action that suspends a User belongs to the Admin Console PRD (#9); here the state is set directly in the database for testing.

### Acceptance criteria

- [ ] A verified User whose email is in `ADMIN_EMAILS` can open `/admin`.
- [ ] An unverified User whose email is in `ADMIN_EMAILS` does not get Admin access.
- [ ] A non-Admin User gets a "not allowed" response from `/admin`; a Guest is redirected to sign in.
- [ ] Removing an email from `ADMIN_EMAILS` removes Admin access without any database change.
- [ ] A suspended User cannot sign in, and an existing session of a suspended User is rejected on the next request.
- [ ] Role resolution is tested through a public function with stub sessions (verified/unverified, case differences, whitespace).

### Issue comments

#### codesuke, 2026-10-10 06:49 UTC

Implemented in d89c510 and 6c0daaf.

- `/admin` derives Admin access on each request from a verified User email and the current trimmed, case-insensitive `ADMIN_EMAILS` list. Empty or malformed entries cannot grant access.
- Guests redirect to sign-in; other Users see the "Not allowed" page. The denial page currently returns HTTP 200 because this slice specifies the visible response, not a status code.
- Better Auth refuses new sessions for suspended Users and rejects their existing sessions on the next auth request. Server-rendered pages recheck the current User row before accepting a session.
- The public `resolveRole` function has stub-session tests; a database-backed auth test covers suspension.

Verification: `pnpm check` passed (lint, workspace typecheck, tests, build). After the final allow-list fix, focused web tests (7 passing), web typecheck, and Biome passed. A live Next.js check against the configured PostgreSQL server covered Guest redirect, unverified allow-listed User denial, verified Admin access, non-Admin denial, and suspended-session redirect from `/admin`.
