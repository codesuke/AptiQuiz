# Slice #35: Close and reveal a Round

- Parent PRD: [#5](https://github.com/codesuke/AptiQuiz/issues/5) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/35
- Slice type: Vertical
- Closed: 2026-10-10
- Commit: `defe31e`

## Acceptance-criteria result

All criteria met.

## Implementation summary

The registry closes the Round through the Game Engine `CLOSE_QUESTION` transition, only from `QUESTION_OPEN`, at the server deadline (injectable scheduler; it waits past `endsAt` so an Answer exactly at the deadline still counts) or when every connected Participant has answered (checked after each Answer and after a last-socket disconnect; never with zero connected). Each Participant receives the correct option in their own id space, their result, and every Participant's Round points; the Host gets authored ids. After closure, a new Answer gets `round_not_open` and a replay returns its first result.

## Verification evidence

`reveal.test.ts` (12): deadline closure, early closure with one reveal per receiver despite a later timer, no early closure while someone connected is unanswered, closure after a disconnect, timer/Answer and double-final-Answer races, per-receiver correct ids and points, and post-close refusal and replay. See the PRD archive for the full-suite and end-to-end results.

## Authorship

Codesuke <codesuke@gmail.com> (`defe31e`). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/5

## Slice type

Vertical

## What to build

The Game Server closes a Round once at its deadline or when all connected Participants have answered, then reveals the correct option and Round scores.

## Acceptance criteria

- [x] The Round closes at the server deadline even when some connected Participants have not answered. It closes early when all connected Participants have answered.
- [x] Closure and reveal occur once despite timer and answer events racing. Before closure, no Participant receives the correct option or explanation; after closure, joined Participants see the correct option and their Round scores.
- [x] An unanswered or wrong Question earns zero. After closure, no Answer or retry can change the accepted Answers, scores, or deadline.
- [x] Round events and acknowledgements reflect the Game Engine phase and are validated at the Socket.IO boundary.

## Test seam

Socket.IO Round events with controlled server time, including deadline closure, early closure, and simultaneous timer/Answer delivery.
