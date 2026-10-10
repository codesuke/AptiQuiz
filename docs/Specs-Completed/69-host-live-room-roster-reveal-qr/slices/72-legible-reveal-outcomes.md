## Final issue snapshot

# Make revealed Round outcomes and rank changes legible

https://github.com/codesuke/AptiQuiz/issues/72

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/69

## Slice type

Vertical

## What to build

Present the Host reveal outcome with fastest-correct and correct-answer highlights, revealed Round points, and the existing cumulative Leaderboard rank-change motion.

## Acceptance criteria

- [ ] The fastest-correct highlight selects the correct Participant with the lowest server-calculated Effective Response Time.
- [ ] Each reveal shows the correct-answer count and shows “No correct answers this Round” without a winner when appropriate.
- [ ] The cumulative Leaderboard remains ordered by the existing authoritative server order.
- [ ] Each revealed Leaderboard row displays that Round's points beside its total score.
- [ ] Rank-order motion remains reduced-motion aware.
- [ ] Presentation tests cover a fastest-correct Round and an all-incorrect Round.

## Test seam

The Host revealed-Round view supplied with the revealed Round contract.

## Result

- Status: closed; all acceptance criteria met.
- Commit: 2c32d7e
- Implementation: reveal-outcome.ts derives fastest correct (lowest server effectiveResponseMs), correct count, and points by Participant; RevealHighlights tiles; Leaderboard rows show +Round points and FLIP-slide from previous rank (reduced-motion aware).
- Verification: Web suite 215 tests, typecheck, Biome pass; fixture render at 1440px and 390px.
- Author: Codesuke (@codesuke), human. Co-authors: none.
