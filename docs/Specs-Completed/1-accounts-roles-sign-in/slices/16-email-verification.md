# Slice #16: Email verification

- Parent PRD: [#1](https://github.com/codesuke/AptiQuiz/issues/1) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/16
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met, according to the closing comment. The notice is rendered on the home page only.

## Implementation summary

- Sign-up sends a verification email through the mail sender (written to the web server log without Gmail credentials in development).
- `/verify-email` shows "Email verified." only for a signed-in, verified User; a signed-out visitor is asked to sign in; expired or invalid links show a resend form.
- A signed-in unverified User sees a notice on the home page with "Resend verification email"; resends are limited to 3 per 5 minutes.
- Nothing is gated on verification (`requireEmailVerification` is off).
- A completed password reset also marks the email verified (review fix in `eea2d65`).

## Verification evidence

- `biome check` clean.
- `pnpm typecheck` 7/7 tasks.
- `pnpm test` 11/11 tasks; the web package ran 45 tests, including database-backed auth tests against the configured PostgreSQL server.
- `pnpm build` 7/7 tasks.
- Reviewed with `code-review` (Standards and Spec); findings fixed in `eea2d65` and `dc9410f`.

## Authorship

- Commits on `main`: `059315d` (feature), `eea2d65` (review fixes), `dc9410f` (docs), all by Codesuke <codesuke@gmail.com>.
- No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#16](https://github.com/codesuke/AptiQuiz/issues/16)
- State at archive time: CLOSED (closed 2026-10-10)
- Labels: ready-for-agent

### Parent

#1

### Slice type

Vertical

### What to build

A new User receives a verification email on sign-up and becomes verified after following the link. While unverified, a signed-in User sees a persistent notice explaining that verification is needed to earn College League points, with a "Resend verification email" action. Unverified Users can still play and host.

### Acceptance criteria

- [ ] Signing up sends a verification email through the mail sender (logged locally without Gmail credentials).
- [ ] Following the link marks the User verified and the notice disappears.
- [ ] An unverified User sees the notice and can resend the email; resends are rate-limited.
- [ ] An invalid or expired verification link shows a clear message with a way to resend.
- [ ] Unverified Users are not blocked from any existing page or action.

### Issue comments

#### codesuke, 2026-10-10 07:30 UTC

Shipped in 059315d (email verification), with review fixes in eea2d65 and docs in dc9410f.

- Sign-up sends a verification email through the mail sender; without Gmail credentials in development it is written to the web server log.
- Following the link marks the User verified. `/verify-email` shows "Email verified." only for a signed-in, verified User. A signed-out visitor is asked to sign in.
- A signed-in unverified User sees a notice on the home page with "Resend verification email". Resends are limited to 3 per 5 minutes.
- An expired or invalid link shows a clear message with a resend form.
- Nothing is gated on verification (`requireEmailVerification` is off).
- A completed password reset also marks the email verified, because it proves inbox ownership.

Known limitation: the notice is rendered on the home page only; other pages will need it when they exist.

Checks on the merged branch: `biome check` clean, `pnpm typecheck` 7/7, `pnpm test` 11/11 tasks (web 45 tests, including database-backed auth tests), `pnpm build` 7/7. Reviewed with `code-review` (Standards + Spec); findings fixed in eea2d65 and dc9410f. Commits are on local `main` and not yet pushed.
