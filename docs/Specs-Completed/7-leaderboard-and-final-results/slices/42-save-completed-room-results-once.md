# Slice #42: Save completed Room results once

- Parent PRD: [#7](https://github.com/codesuke/AptiQuiz/issues/7) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/42
- Slice type: Horizontal
- Closed: 2026-10-10
- Commit: 694f0c0

## Acceptance-criteria result

All criteria met.

## Implementation summary

`completeRoom` (`@aptiquiz/database`) writes every MatchResult and the Room completion time in one transaction under a row lock, and a retry re-reads the first committed rows. MatchResult gains `userId`, `emailVerifiedAtCompletion` and `rank`; `averageResponseMs` is nullable; `topicStats` holds correct/total for every Topic in the Room snapshot. Migration `20261010104709_match_result_snapshot`. `summarizeMatch` (pure engine) computes the metrics. The final `room:advance` is now async: it commits first and only then moves the Room to `FINISHED`; a failed commit returns `advance_failed` and can be retried.

## Verification evidence

`match-results.test.ts` (game-server, 5, real PostgreSQL via Socket.IO), `match-results.test.ts` (database, 5: snapshot, retry, 4 concurrent calls, rollback, empty Room), and `results.test.ts` (engine, 3). They cover correct/incorrect/unanswered/multi-Topic/no-Answer cases, Guest null userId, snapshot surviving Home College and verification changes, failed commit then retry, concurrent and repeated completion, and League-style queries.

## Authorship

Codesuke <codesuke@gmail.com> (694f0c0). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/7

## Slice type

Horizontal

## What to build

A finished Room has one durable MatchResult per joined Participant. The Game Server calculates final metrics from accepted Answers and the Room's Question snapshot, commits the results and completion time together, and makes retries safe. This persistence foundation is verifiable through the public match flow and PostgreSQL before the final results screen is added.

## Acceptance criteria

- [x] Advancing after the final Leaderboard commits one MatchResult for every joined Participant and one Room completion time. The Host alone has no Participant result. A Guest result has a null User ID.
- [x] Each result records final rank and total score, correct Answers over all Room Questions, average Effective Response Time over all accepted Answers including incorrect ones, and correct/total counts for every Topic in the Room snapshot. Unanswered Questions count in accuracy and Topic denominators; no accepted Answers yields an unavailable average.
- [x] A signed-in Participant's result records their User ID, verification status read at completion, and College attached to their Room participation. Later Home College or verification changes do not alter the saved snapshot.
- [x] Repeated or concurrent completion attempts return the same committed results without duplicate or changed rows. If the transaction fails, the Room is not announced as finished and a retry can complete it.
- [x] The saved results expose the User ID, verification status, College, score, and completion time required by College League queries.

## Test seam

Drive final Host advancement through the Game Server's public Socket.IO flow and inspect Room and MatchResult records in the configured PostgreSQL test server, including retry, concurrent completion, and failed-transaction cases.
