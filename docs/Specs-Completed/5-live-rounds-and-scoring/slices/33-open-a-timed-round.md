# Slice #33: Open a timed Round

- Parent PRD: [#5](https://github.com/codesuke/AptiQuiz/issues/5) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/33
- Slice type: Vertical
- Closed: 2026-10-10
- Commit: `ffca687`

## Acceptance-criteria result

All criteria met. The browser countdown check passed in the PRD end-to-end run: two headless browsers read the same 30 s from the same server deadline.

## Implementation summary

Start opens Question 0 with an immutable server `startsAt` and `endsAt` (30 s, Game Server config). Each Participant receives `round:state` on a per-Participant channel, with a stable seeded option order and opaque per-Participant option ids. The Host receives the authored order. Join and host acknowledgements carry the current Round. Browsers count down from server timestamps with a clock offset. The `now` clock is injectable.

## Verification evidence

Game Server Socket.IO tests: same Question and deadline for two Participants, per-Participant orders and opaque ids, stable order and deadline across rejoin, a deep scan finding no `correctOptionId` or `explanation` before the reveal, and no second Round or moved deadline on a repeated start. `lib/server-clock` unit tests cover skewed browser clocks. See the PRD archive for the full-suite and end-to-end results.

## Authorship

Codesuke <codesuke@gmail.com> (`ffca687`). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/5

## Slice type

Vertical

## What to build

Starting a Room opens a server-timed Round and shows its public Question and countdown to joined Participants.

## Acceptance criteria

- [x] The Game Server opens the first Round with one immutable start time and a deadline 30 seconds later. Two Participants receive the same Question and deadline; browser countdowns use server timestamps for display.
- [x] Each Participant receives a stable, server-assigned option order for that Participant and Round. The current Question and order remain stable within the Round.
- [x] No pre-reveal event or snapshot exposes the correct option or explanation. Only public Question fields and opaque option identifiers reach Participants.
- [x] A repeated start or Round-open command cannot open another Round or change the existing deadline.

## Test seam

Socket.IO Room start and Round-open events through the running Game Server with two joined Participants, plus a browser countdown check.
