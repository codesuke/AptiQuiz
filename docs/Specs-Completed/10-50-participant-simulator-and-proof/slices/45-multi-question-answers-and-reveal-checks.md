# Slice #45: Simulate multi-Question Answers and reveal checks

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/45
- Slice type: Vertical
- Parent PRD: [#10](https://github.com/codesuke/AptiQuiz/issues/10)
- Commits: ec42947

## Acceptance-criteria result

All criteria met. Late Answers at the deadline come back as round_not_open (the deadline timer wins the race); answer_too_late is also accepted but was not observed.

## Implementation summary

Host starts and advances through all three starter Questions. Cohorts submit correct, wrong, new-key duplicate, exact-key replay, and deliberately late Answers; one cohort stays silent in the first Round. Revealed points, score tables, and Question content are checked; every pre-reveal payload is scanned.

## Verification evidence

- Simulator unit tests, Biome, and TypeScript typecheck pass (66 tests at the end).
- Process-level runs against a running web app and Game Server; see the PRD summary.

## Authorship

Derived from commit authors on `main`: Codesuke <codesuke@gmail.com>. The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/10

## Slice type

Vertical

## What to build

Extend the Room simulator through every Question of the seeded starter Question Set. Use the known fixture and each Participant's public opaque option ids to submit deterministic correct and wrong Answers. Deliberately submit new-key duplicate and post-deadline late Answers, leave some Participants unanswered, and verify reveal and scoring through public events. Keep a Participant unanswered until the deadline in at least one Round so early closure cannot bypass the late-Answer check. The Host advances only through the public command after reveal.

## Acceptance criteria

- [ ] A local run plays and completes all starter Questions after the 50-Participant Lobby stage.
- [ ] Correct, wrong, and unanswered cases produce the expected revealed Round points; each Participant earns at most one score per Round.
- [ ] A deliberate new-key duplicate after an accepted Answer and an Answer sent after the server deadline are rejected and counted separately; an exact-key retry is treated according to the public idempotency contract.
- [ ] Every pre-reveal event, Answer acknowledgement, and available snapshot is checked for correct-option markers, correctness disclosure, or explanation; a leak fails the run.
- [ ] The simulator fails clearly if the Room's Question content does not match the starter fixture, a required acknowledgement or reveal is missing, or a bounded wait expires.
- [ ] The structured report adds accepted Answer, deliberate rejection, Question completion, error, and labelled client-observed event-latency measurements.

## Test seam

The simulator process against the running Game Server's public Round commands, acknowledgements, state, and reveal events. Assert the process result and report; reuse the Game Server Answer and reveal integration tests as prior art.
