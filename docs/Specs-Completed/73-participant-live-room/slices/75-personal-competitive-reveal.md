# Slice #75: Make Participant reveal results personal and competitive

Issue: https://github.com/codesuke/AptiQuiz/issues/75
Slice type: Vertical

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/73

## Slice type

Vertical

## What to build

Present Participant reveal results in a personal-first sequence with Round points, current rank and movement, shared fastest-correct and accuracy highlights, and the authoritative cumulative Leaderboard.

## Acceptance criteria

- [ ] Personal outcome appears before shared reveal content and prominently includes Round points, current rank, and rank movement.
- [ ] Fastest correct uses the server-provided Effective Response Time and the reveal includes the correct-answer count.
- [ ] An all-incorrect Round says “No correct answers this Round” and has no fastest-correct winner.
- [ ] The Leaderboard retains authoritative server order and reduced-motion-aware movement.
- [ ] Every revealed Leaderboard row shows that Round's points beside its cumulative total.
- [ ] No new result, timing, or shared standings data appears during an open Question.

## Test seam

The Participant revealed-Round view supplied with public revealed fixtures, backed by the existing contract-secrecy coverage.

## Result

All acceptance criteria met. Implemented in commit 4f40aed. Tests: `round/participant-reveal.test.tsx, round/personal-result.test.ts`. Author: Codesuke.
