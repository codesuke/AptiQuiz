# Slice #60: Complete the Match and show final results automatically

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/60
- Slice type: Vertical
- Parent PRD: [#57](https://github.com/codesuke/AptiQuiz/issues/57)
- Commits: f1c15d2
- Status: implemented and closed

## Acceptance-criteria result

The observable behavior in this slice is implemented and covered by the verification below. Browser inspection remains an open verification gap for motion and sound in #61 and #62.

## Implementation summary

After the final reveal, the Room shows Finalizing results and retries failed database completion every 2 seconds. FINISHED is published only after commit. A dedicated results view shows the top three, full standings, and the Participant’s metrics without inventing a Host result.

## Verification evidence

PostgreSQL integration tests covered a failed first save, concurrent timer attempts, and one durable result per Participant. Full lint, typecheck, test, and build passed after this slice.

## Authorship

Derived from implementation commit authors: Codesuke <codesuke@gmail.com>. The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/57

## Slice type

Vertical

## What to build

The final reveal automatically enters Finalizing results, retries a failed save at a bounded frequency, then shows a focused final results screen after durable completion.

## Acceptance criteria

- [ ] After the final 6-second reveal, all Room viewers see Finalizing results; the Room is not FINISHED before its database transaction succeeds.
- [ ] A failed save is retried automatically without a Host command; repeated or concurrent attempts leave one unchanged MatchResult per Participant.
- [ ] FINISHED broadcasts the same saved order and metrics to Host and Participants; reconnects recover the results.
- [ ] The final results take the primary screen, highlight the top three, show the full Leaderboard, and clearly show the Participant's own score, rank, accuracy, Average Effective Response Time, and Topic strengths.
- [ ] The Host receives no invented Participant result; no-Answer Participants and narrow screens remain readable.

## Test seam

Public Socket.IO final Round and reconnect flow with injected clock/scheduler and configured PostgreSQL, including a simulated first completion failure; focused final results view tests.
