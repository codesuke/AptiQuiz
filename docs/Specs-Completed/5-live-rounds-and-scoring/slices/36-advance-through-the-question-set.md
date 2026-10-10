# Slice #36: Advance through the Question Set

- Parent PRD: [#5](https://github.com/codesuke/AptiQuiz/issues/5) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/36
- Slice type: Vertical
- Closed: 2026-10-10
- Commit: `3c7dd72`

## Acceptance-criteria result

All criteria met. The Room status `FINISHED` is also written to PostgreSQL.

## Implementation summary

`room:advance` is Host-only and allowed only from `QUESTION_REVEAL`. It opens the next Question through the shared open-Round path, with a fresh deadline and per-Round state, or finishes after the last Question. A replayed key returns its first result; a new key while a Round is open gets `round_not_revealed`; a finished Room gets `room_finished`. Deadline timers are bound to their Question index. The Host page shows "Next question" / "Finish match", and all browsers show "Match finished."

## Verification evidence

`advance.test.ts` (10): Host-only, phase refusals, fresh deadline and Question order, idempotent replay, no skip, per-Round early closure and deadlines, old-index Answers, and finishing. Engine advance tests and the database `markRoomFinished` test. See the PRD archive for the full-suite and end-to-end results.

## Authorship

Codesuke <codesuke@gmail.com> (`3c7dd72`). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/5

## Slice type

Vertical

## What to build

After a reveal, the Host advances through the remaining Questions, and the Game Server finishes the Room after the last one.

## Acceptance criteria

- [x] Only the Room's Host can advance after reveal. A Guest, another User, or an advance request in another phase is refused without changing the Room.
- [x] Advancing opens the next Question in the selected Question Set order with a new server start time and 30-second deadline. Previously revealed Answers and scores remain unchanged.
- [x] Repeating an advance command or idempotency key cannot skip a Question or open two Rounds.
- [x] Advancing after the last Question moves the Room to `FINISHED` without opening another Round. Connected Participants see the finished state; #7 supplies final metrics and Leaderboard presentation.

## Test seam

Socket.IO Host commands through a multi-Question Room, including unauthorized and repeated commands and final completion.
