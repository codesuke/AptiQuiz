# Slice #30: Host creates a Room

- Parent PRD: [#4](https://github.com/codesuke/AptiQuiz/issues/4) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/30
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

A signed-in Host selects an owned Question Set or the starter set and creates a Room with its Home College, a stable Question snapshot, a unique Join Code, and a shareable link.

## Acceptance criteria

- [x] A signed-in, non-suspended User with a Home College can select an owned Question Set or the starter set (#25), create a Room, and copy its Join Code and shareable link. Hosting does not require email verification.
- [x] The Room records the Host, Home College, selected Question Set, and a stable snapshot of its Questions. Editing the source Question Set later does not change the Room's snapshot.
- [x] The Host's Lobby shows a QR code encoding the join link, scannable from a phone at arm's length; scanning it opens the join flow for that Room.
- [x] The Host's Lobby has a Share button: where the browser supports the native share sheet, it opens with the join link and a short invite naming the Room's College; elsewhere it copies the link and confirms the copy. The QR code is generated in the browser.
- [x] A User without a Home College is prompted to choose one. A Guest, suspended User, or User selecting another User's Question Set cannot create the Room.
- [x] Each new Room has a unique six-character Join Code using the established code format. Retrying creation with the same idempotency key returns the original Room.
- [x] The creation request is validated at its public boundary, and the Game Server accepts it only from the authorized web server.

## Test seam

Room creation through the web app's public request and authenticated Game Server handoff, with College, Question Set, and Room assertions against the configured PostgreSQL test server.


