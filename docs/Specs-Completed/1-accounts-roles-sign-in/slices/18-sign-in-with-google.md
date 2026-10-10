# Slice #18: Sign in with Google

- Parent PRD: [#1](https://github.com/codesuke/AptiQuiz/issues/1) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/18
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

Met, with one approved spec change and one verification gap.

- Spec change, approved by the project owner (comments on #18 and #1): Google links to an existing password User only when that User's email is verified (Better Auth `requireLocalEmailVerified`). A completed password reset verifies the email, which gives the real owner a path to link. This narrows criterion 2.
- A new Google User's verified status comes from Google's `email_verified` claim and is not forced to true.
- Not verified: a real Google consent-and-callback round trip, because no Google credentials were configured locally.

## Implementation summary

- "Continue with Google" on `/sign-in` and `/sign-up`, hidden when `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is not set.
- The secret is read only in server-only code.
- When an account is not linked, the sign-in page points to "Forgot password?" (`eea2d65`).
- Local redirect URI `http://localhost:3000/api/auth/callback/google` documented in README.md, Architecture.md, and `.env.example`. Production URIs left to #11.
- Suspended Users are still refused.

## Verification evidence

- Integration test against the real Better Auth handler with a stubbed Google token endpoint.
- A build with marker values showed no Google secret or client id in `.next/static`.
- `biome check` clean.
- `pnpm typecheck` 7/7 tasks.
- `pnpm test` 11/11 tasks; the web package ran 45 tests, including database-backed auth tests against the configured PostgreSQL server.
- `pnpm build` 7/7 tasks.
- Reviewed with `code-review` (Standards and Spec); findings fixed in `eea2d65` and `dc9410f`.

## Authorship

- Commits on `main`: `1eba2a3` (feature), `eea2d65` (linking message), `dc9410f` (docs), all by Codesuke <codesuke@gmail.com>.
- No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#18](https://github.com/codesuke/AptiQuiz/issues/18)
- State at archive time: CLOSED (closed 2026-10-10)
- Labels: ready-for-agent

### Parent

#1

### Slice type

Vertical

### What to build

A visitor can sign in with Google from the sign-in and sign-up pages. A Google sign-in using the email of an existing email-and-password account opens the same User. Google accounts count as verified.

### Acceptance criteria

- [ ] A "Continue with Google" button signs a new visitor in and creates a User.
- [ ] Signing in with Google using an existing password account's email opens that same User (accounts linked).
- [ ] A User created through Google is verified.
- [ ] `GOOGLE_CLIENT_SECRET` never reaches the browser.
- [ ] Local development redirect URI is documented; production redirect URIs are left to the Dokploy Deployment PRD (#11).

### Issue comments

#### codesuke, 2026-10-10 07:30 UTC

Shipped in 1eba2a3 (Google sign-in), with the linking-message update in eea2d65 and docs in dc9410f.

- "Continue with Google" is on `/sign-in` and `/sign-up`. It is hidden when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are not set.
- The secret is read only in server-only code. A build with marker values showed no secret or client id in `.next/static`.
- A new Google User's verified status comes from Google's `email_verified` claim. It is not forced to true, so an unverified address cannot pass the Admin check.
- The local redirect URI `http://localhost:3000/api/auth/callback/google` is documented in README.md, Architecture.md, and `.env.example`. Production URIs are left to #11.
- Suspended Users are still refused (tested).

**Spec change, approved by the project owner:** Google links to an existing password User only when that User's email is verified (Better Auth `requireLocalEmailVerified`). Linking without this check would let someone sign up with another person's email and a password they choose, and then take over that person's later Google sign-in. If the account is not linked, the sign-in page points to "Forgot password?". A completed reset verifies the email, and after that Google sign-in opens the same User.

Not verified: a real Google consent-and-callback round trip, because no Google credentials are configured locally. The flow is covered by an integration test against the real Better Auth handler with a stubbed Google token endpoint.

Checks on the merged branch: `biome check` clean, `pnpm typecheck` 7/7, `pnpm test` 11/11 tasks (web 45 tests, including database-backed auth tests), `pnpm build` 7/7. Reviewed with `code-review` (Standards + Spec); findings fixed in eea2d65 and dc9410f. Commits are on local `main` and not yet pushed.
