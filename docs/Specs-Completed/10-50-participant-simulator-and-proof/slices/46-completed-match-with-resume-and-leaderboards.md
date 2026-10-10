# Slice #46: Prove a completed 50-Participant match with resume and Leaderboards

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/46
- Slice type: Vertical
- Parent PRD: [#10](https://github.com/codesuke/AptiQuiz/issues/10)
- Commits: 7298213

## Acceptance-criteria result

All criteria met. 15 of 15 resumes, 3 of 3 Leaderboards converged, 50 final results verified. Killing the Game Server mid-run exits 1 with a timeout error.

## Implementation summary

A subset resumes mid-Round with its Resume Token and must keep identity, score, Answer state, option order, and deadline. Every viewer's ordered Leaderboard must match the revealed points; saved results must match the totals.

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

Complete the full-match simulator by disconnecting and resuming a nonzero subset of Participants during an open Round, checking identity and score continuity, and verifying that connected viewers receive the same ordered Leaderboard after each Round. At match completion, verify one final result per joined Participant and totals equal the sum of revealed Round points. Produce the final machine-readable success or failure report and bounded overall run.

## Acceptance criteria

- [ ] A local default run with 50 distinct Participants completes every starter Question and exits zero with one final result per Participant.
- [ ] Resumed Participants keep their Participant id, prior score, Answer state, public Question option order, and original deadline, receive later events, and occupy one roster place.
- [ ] Connected Host and Participant viewers receive identical ordered Leaderboards after each Round; inconsistent or missing standings fail the run.
- [ ] Final Participant totals equal their revealed Round point sums, including wrong, unanswered, duplicate, and late cases.
- [ ] A timeout, missing event, failed resume, extra score, or inconsistent result produces a nonzero exit with unexpected errors identified, without exposing credentials or Resume Tokens.
- [ ] The report includes connected and joined counts, accepted Answers, intentional duplicate and late rejections, successful resumes, completed Questions, error counts, timing constants, and labelled p50/p95/max latency metrics with sample counts.

## Test seam

The full simulator process against a running Game Server through public Socket.IO Room, Round, resume, Leaderboard, and completion events. Verify both a smaller diagnostic run and the default 50-Participant local run, including process failure on an induced invalid setup or missing required event.
