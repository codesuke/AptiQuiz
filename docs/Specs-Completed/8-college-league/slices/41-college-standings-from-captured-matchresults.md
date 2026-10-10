# Slice #41: College standings from captured MatchResults

- Parent PRD: [#8](https://github.com/codesuke/AptiQuiz/issues/8) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/41
- Slice type: Vertical
- Closed: 2026-10-10
- Commit: `5a4a985` (slices #39 and #41 share one commit)

## Acceptance-criteria result

All criteria met.

## Implementation summary

The same query returns the top 10 Colleges: counted scores grouped by each result's captured College id, ordered by score desc / College name asc / College id asc, sequential ranks, limit after aggregation, Zod-validated. The page adds a second accessible "Colleges" table with its own empty state. A User's results go to the College captured at the time while keeping one Participant row.

## Verification evidence

College cases in `college-league.test.ts` (two Rooms to one College, multi-College attribution, Home College and verification changes, Guest and unverified, week boundaries, zero-score College, more than 10 Colleges, name and id ties, completion retry, empty week) and the College table tests in `college-league-view.test.tsx`.

## Authorship

Codesuke <codesuke@gmail.com> (`5a4a985`). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/8

## Slice type

Vertical

## What to build

Extend the public weekly College League page with the top 10 Colleges for the same UTC League Period. Sum eligible completed MatchResult scores by the College captured for each Participant result. A User may contribute to different Colleges through different Rooms while keeping one Participant standing. Show College name, total score, and rank. Refreshing the page reflects newly persisted results.

## Acceptance criteria

- [x] Two eligible completed Rooms attributed to one College add to that College total.
- [x] A User who played for different Colleges contributes each result only to its captured College, without splitting the User's Participant standing.
- [x] Later Home College changes do not move past College points; later verification changes do not make an ineligible result eligible or remove an eligible result.
- [x] Guest and unverified results do not contribute to any College; an eligible zero-score result is counted without adding points.
- [x] Results outside the displayed Monday–Sunday UTC week do not contribute.
- [x] At most 10 Colleges appear, ordered by total score descending, then College name ascending, then stable id ascending, with sequential ranks.
- [x] A completion retry does not increase any College total; refreshing after a new completed Room shows the updated standings.
- [x] The College table is readable and keyboard accessible at desktop and mobile widths, with a clear empty state when no College has a Counted Match.

## Test seam

Database-backed College League query over persisted completed MatchResults in the configured PostgreSQL test server, including multi-College attribution, period boundaries, eligibility, ordering, and idempotency; one page-level behavior check for the College table and empty state.
