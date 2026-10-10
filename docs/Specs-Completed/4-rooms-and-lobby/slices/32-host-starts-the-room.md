# Slice #32: Host starts the Room

- Parent PRD: [#4](https://github.com/codesuke/AptiQuiz/issues/4) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/32
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

The Room's Host starts the match once from the Lobby, and all connected Room members see that the Room has left the Lobby.

## Acceptance criteria

- [x] The Room's Host can start it from the Lobby. The Game Server authorizes the command and publishes the changed Room phase to its connected members.
- [x] A Guest or another User cannot start the Room. A repeated start or retry cannot create a second transition.
- [x] Once the Room leaves the Lobby, a new join receives a clear error and does not add a Participant or change the roster.
- [x] The start command and acknowledgement are runtime-validated; the Game Engine governs the phase transition. Timed Question delivery remains in #5.

## Test seam

Socket.IO start and join commands through a running Game Server with a Host, another User, a Guest, and joined Participants in two browser sessions.

