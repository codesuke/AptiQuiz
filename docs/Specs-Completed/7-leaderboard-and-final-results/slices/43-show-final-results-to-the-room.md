# Slice #43: Show final results to the Room

- Parent PRD: [#7](https://github.com/codesuke/AptiQuiz/issues/7) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/43
- Slice type: Vertical
- Closed: 2026-10-10
- Commit: 694f0c0 (server) and 9d101b9 (web)

## Acceptance-criteria result

All criteria met.

## Implementation summary

The lobby snapshot gains an optional `results` array (`finalResultSchema`), present only after the Room is `FINISHED` with committed results. It reaches the Host and Participants through the advance acknowledgement, the `room:lobby` broadcast, and the host and join acknowledgements. The web shows a minimal Final results list with rank, score, accuracy, "Average Effective Response Time" (— when none), and Topic strengths. Without `results`, the screen shows "Finishing…".

## Verification evidence

Four tests in `advance.test.ts` (identical results for Host and Participants, Guest and no-Answer cases, returning viewers, failed save then retry) and `final-results-view.test.ts` for formatting and own-row detection.

## Authorship

Codesuke <codesuke@gmail.com> (694f0c0 (server) and 9d101b9 (web)). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/7

## Slice type

Vertical

## What to build

After durable completion, the Host and Participants see the same final Room results with standings and performance metrics. A returning viewer receives the completed results.

## Acceptance criteria

- [x] After the final Leaderboard and successful completion save, the Host and connected Participants see every joined Participant's final rank, total score, accuracy count and percentage, average Effective Response Time, and Topic strength counts and percentages.
- [x] A Participant with no accepted Answers sees an unavailable average time rather than zero; unanswered Questions remain visible through accuracy and Topic denominators. Guests and unverified Users see their Room results.
- [x] A returning Host or Participant receives the completed results without requiring the original completion broadcast. All viewers see the same saved values and order.
- [x] A persistence failure does not show a completed result screen. The final screen remains readable on desktop and mobile and does not rely on color alone to convey rank movement or performance.

## Test seam

Complete a multi-Question Room through Socket.IO and verify the rendered Host and Participant screens against the saved MatchResult values, including Guest and no-Answer cases and a returning viewer.
