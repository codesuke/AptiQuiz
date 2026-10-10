# Slice #31: Participants join the Lobby

- Parent PRD: [#4](https://github.com/codesuke/AptiQuiz/issues/4) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/31
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met. Phone-camera QR scanning and the phone share sheet were not exercised on a physical device.

## Implementation and verification

See the PRD archive build and verification summaries. Commits: `e565f70`, `deafa8a`.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/4

## Slice type

Vertical

## What to build

Guests and signed-in Users join a Room by Join Code or link and see a live, Room-specific Lobby roster and the scoring rule before play.

## Acceptance criteria

- [x] A Guest and a signed-in User can each join a Room in the Lobby with a valid display name. A Guest is not asked to choose a College.
- [x] Each Participant records the joining User's id when signed in, or null for a Guest. A signed-in Participant records their Home College when present; a Guest or signed-in User without one records the Room College.
- [x] Two browser sessions in one Room see roster updates without reloading. Participants in another Room do not appear in that roster.
- [x] The Lobby shows the Room College, Question Set title, Join Code, current Participants, and the visible scoring rule on narrow and desktop screens.
- [x] Invalid or unknown Join Codes and invalid display names return clear errors without adding a Participant. Exactly 50 Participant identities can join one Room; a 51st receives a full-Room error without changing the roster.
- [x] Retrying a join with the same idempotency key returns the original Participant without adding a second identity.

## Test seam

Socket.IO join and Lobby updates through the running Game Server, Participant linkage against the configured PostgreSQL test server, and two browser sessions.

