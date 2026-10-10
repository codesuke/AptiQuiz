# Slice #34: Accept and score Answers

- Parent PRD: [#5](https://github.com/codesuke/AptiQuiz/issues/5) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/34
- Slice type: Vertical
- Closed: 2026-10-10
- Commit: `146d03e`

## Acceptance-criteria result

All criteria met.

## Implementation summary

`round:answer` accepts only from a socket that joined as a Participant. The first valid Answer received at or before `endsAt` by server receipt time is accepted, with no grace. A replayed key (scoped to Participant, Question, and key) returns the original result; a new key gets `already_answered`. Typed refusals for malformed, unknown Room, non-Participant, wrong Round, foreign option, and late Answers. Server-initiated `latency:ping` samples (every 2 s, 5-sample window, 2 s timeout) feed the Game Engine `medianRoundTrip`; `effectiveResponseTime` subtracts `min(median/2, 100 ms)`, clamps, and floors to 100 ms; `scoreAnswer` gives 500–1000 for a correct Answer and 0 for a wrong one. The Lobby shows the rules from server values, and the README documents them.

## Verification evidence

`answers.test.ts` (on time, exactly at the deadline, +1 ms and +150 ms late with a large RTT, duplicate, same-key retry after the deadline, malformed, unknown Room, non-Participant and Host, wrong Round, authored and foreign option ids, no correctness in acks) and 880/890/880-point scoring cases. Engine `scoring.test.ts` (12). See the PRD archive for the full-suite and end-to-end results.

## Authorship

Codesuke <codesuke@gmail.com> (`146d03e`). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/5

## Slice type

Vertical

## What to build

The Game Server accepts each Participant's first valid on-time Answer and calculates server-authoritative speed-and-accuracy points under the approved timing policy.

## Acceptance criteria

- [x] Only a joined Participant can submit an Answer for the current Room, Round, Question, and option. Malformed, unauthorized, wrong-Room/Round/Question/option, duplicate, and late commands receive typed refusals without changing state.
- [x] The first valid Answer received at or before the server deadline is accepted once. A retry with the same idempotency key returns the original result; a second Answer cannot add points or replace the first.
- [x] A server receipt after the deadline is rejected with no grace period, regardless of any delay compensation.
- [x] For scoring, the Game Server uses a rolling median of server-initiated ping/pong samples, subtracts at most 100 ms of one-way delay, or zero with no valid sample, then floors Effective Response Time to 100 ms buckets. Faster correct Answers earn 500–1000 points from the approved formula; wrong Answers earn zero.
- [x] Pre-reveal acknowledgements do not disclose correctness or the correct option. The scoring and delay rules are visible before play and documented with their values.

## Test seam

Socket.IO Answer acknowledgements at on-time, deadline, duplicate, and invalid-input boundaries, with exported Game Engine tests for scoring and bucketing.
