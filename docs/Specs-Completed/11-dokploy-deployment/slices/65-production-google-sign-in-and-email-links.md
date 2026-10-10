# Slice #65: Verify production Google sign-in and email links

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/65
- Slice type: Horizontal
- Parent PRD: [#11](https://github.com/codesuke/AptiQuiz/issues/11)
- Acceptance criteria: all met (see below).

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/11

## Slice type

Horizontal

## What to build

Production auth verified on the deployed web app: Google sign-in works and auth emails link to the production domain.

## Acceptance criteria

- [x] BETTER_AUTH_URL is the production web URL.
- [x] Google sign-in completes on https://aptiquiz.codesuke.in using the production redirect URI.
- [x] Verification and password-reset emails link to the production domain.

## Test seam

Deployed sign-in flow and received emails (manual round trip by the owner).

## Implementation summary

The live sign-in page shows Continue with Google and the OAuth URL carries redirect_uri https://aptiquiz.codesuke.in/api/auth/callback/google. The owner completed a Google sign-in and checked the email links and reported it working.

## Verification evidence

Evidence comment on issue #65. The email link domain rests on the owner's report; no message was captured.

## Authorship

Codesuke <codesuke@gmail.com> is the repository author. Probes and docs were produced with an AI agent under the user's direction.
