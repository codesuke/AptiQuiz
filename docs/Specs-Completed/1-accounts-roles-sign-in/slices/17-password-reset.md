# Slice #17: Password reset

- Parent PRD: [#1](https://github.com/codesuke/AptiQuiz/issues/1) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/17
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met, according to the closing comment.

## Implementation summary

- Flow: `/forgot-password` -> "Check your inbox" -> link -> `/reset-password` -> `/reset-password/success` -> sign in. An expired or used link shows the expired-link page with "Request a new link".
- Unknown and known emails get the same response and confirmation; the email is sent without awaiting it, so response time does not reveal account existence.
- One-hour, single-use link. After reset the old password is rejected (401), the new one works, other sessions end (`revokeSessionsOnPasswordReset`), and the email is marked verified.
- The confirmation renders the submitted email as React text.
- Reset requests limited to 3 per 5 minutes per client (Better Auth in-memory rate limit store).
- Accessibility: visible labels and focus, show/hide toggle with changing accessible name, `autocomplete` `email` and `new-password`, controls at least 44px, no horizontal scroll at 360px.

## Verification evidence

- `biome check` clean.
- `pnpm typecheck` 7/7 tasks.
- `pnpm test` 11/11 tasks; the web package ran 45 tests, including database-backed auth tests against the configured PostgreSQL server.
- `pnpm build` 7/7 tasks.
- Reviewed with `code-review` (Standards and Spec); findings fixed in `eea2d65` and `dc9410f`.

## Authorship

- Commits on `main`: `ebd8fce` (feature), `6aba7a6` (integration test fix), `eea2d65` (review fixes), all by Codesuke <codesuke@gmail.com>.
- No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#17](https://github.com/codesuke/AptiQuiz/issues/17)
- State at archive time: CLOSED (closed 2026-10-10)
- Labels: ready-for-agent

### Parent

#1

### Slice type

Vertical

### What to build

A User who forgot their password can request a reset email, follow the link, set a new password, and sign in with it. The flow uses the mock kit's states: request form → email confirmation → reset form → reset success → sign in; an expired link leads to the expired-link page.

### Acceptance criteria

- [ ] Requesting a reset for a known email sends a reset link through the mail sender.
- [ ] Requesting a reset for an unknown email shows the same confirmation as a known one.
- [ ] Following a valid link and setting a new password succeeds; the old password stops working and the User's other sessions end.
- [ ] An expired or used link shows the expired-link page with a "Request a new link" action.
- [ ] The confirmation page renders the submitted email as escaped text.
- [ ] Reset requests are rate-limited.
- [ ] Pages meet the same accessibility bar as the sign-in pages (labels, focus, show/hide password with changing accessible labels, `autocomplete` values per the mock kit).

### Issue comments

#### codesuke, 2026-10-10 07:30 UTC

Shipped in ebd8fce (password reset), plus 6aba7a6 (integration test fix) and review fixes in eea2d65.

- Flow: `/forgot-password` → "Check your inbox" → link → `/reset-password` → `/reset-password/success` → sign in. An expired or used link shows the expired-link page with "Request a new link".
- An unknown email gets the same response and confirmation as a known one. The email is sent without waiting for it, so response time does not reveal which emails have accounts.
- After a reset, the old password is rejected (401) and the new one works. The User's other sessions end (`revokeSessionsOnPasswordReset`). The email is marked verified.
- The confirmation renders the submitted email as React text.
- Reset requests are limited to 3 per 5 minutes per client.
- Accessibility: visible labels and focus, a show/hide toggle whose accessible name changes, `autocomplete` set to `email` and `new-password`, controls at least 44px, and no horizontal scroll at 360px.

Rate limiting uses Better Auth's in-memory store, which is fine with one server process.

Checks on the merged branch: `biome check` clean, `pnpm typecheck` 7/7, `pnpm test` 11/11 tasks (web 45 tests, including database-backed auth tests), `pnpm build` 7/7. Reviewed with `code-review` (Standards + Spec); findings fixed in eea2d65 and dc9410f. Commits are on local `main` and not yet pushed.
