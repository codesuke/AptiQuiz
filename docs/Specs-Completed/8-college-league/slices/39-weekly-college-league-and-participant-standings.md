# Slice #39: Weekly College League and Participant standings

- Parent PRD: [#8](https://github.com/codesuke/AptiQuiz/issues/8) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/39
- Slice type: Vertical
- Closed: 2026-10-10
- Commit: `5a4a985` (slices #39 and #41 share one commit)

## Acceptance-criteria result

All criteria met, verified at the database seam and the rendered component. The page itself is covered by a mocked-database test (public render, request-time `new Date()`, `force-dynamic`).

## Implementation summary

`getCollegeLeague(db, now)` (`@aptiquiz/database`) runs one SQL aggregation over persisted MatchResults: counted = non-null `userId` and `emailVerifiedAtCompletion`, period chosen by `completedAt` in [Monday 00:00 UTC, next Monday), summed per User, distinct captured College names, ordered by score desc / display name asc / user id asc (byte-order collation), ranks sequential, limit 10 after aggregation, rows parsed with Zod. The public `/league` page (`force-dynamic`, no session) shows the Monday–Sunday dates with a UTC label, an accessible Participant table, an empty state, and a College League link in the home footer.

## Verification evidence

`college-league.test.ts` (database-backed, per-test random far-future weeks): two Rooms summed, multi-College user in one row, Guest and unverified excluded, later Home College and verification changes ignored, exact Monday boundaries, zero scores, empty week, more than 10 users, name and id ties, completion retry. `league-view.test.ts`, `college-league-view.test.tsx`, and `page.test.tsx` for the label, tables, empty states, and request-time rendering.

## Authorship

Codesuke <codesuke@gmail.com> (`5a4a985`). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/8

## Slice type

Vertical

## What to build

Deliver a public College League page, reachable from the application, for the current Monday–Sunday UTC League Period. Show the top 10 Participants from Counted Matches persisted by #7. A Counted Match is a completed Room result for a signed-in User whose verified status was captured as true at match completion. Sum each User's eligible result scores once across Rooms; show their rank, score, display name, and every distinct College captured by those results. Use the result completion time and captured identity, verification, and College, not current account fields. Display the week dates and UTC label, and provide an empty state.

## Acceptance criteria

- [x] A visitor can reach and open the College League without signing in; the page shows the current Monday–Sunday dates and UTC label.
- [x] Two eligible completed Rooms in the week add to one Participant total and row.
- [x] Guest and unverified results remain available in Room final results but do not appear in the League.
- [x] A User who represented different Colleges during the week still has one Participant row listing each captured College; later Home College or verification changes do not alter past eligibility or College names.
- [x] A result at Monday 00:00 UTC is included and a result at the next Monday 00:00 UTC is excluded; Room creation and join times do not select the period.
- [x] Eligible zero-score results remain visible. A week without eligible results shows a clear empty state.
- [x] At most 10 Participants appear, ordered by total score descending, then display name ascending, then stable id ascending, with sequential ranks.
- [x] Retrying match completion does not increase a Participant total.
- [x] The page is readable and keyboard accessible at desktop and mobile widths.

## Test seam

Database-backed College League query over persisted completed MatchResults in the configured PostgreSQL test server, plus one page-level behavior check for public access, period label, standings, and empty state. Follow existing database-backed Rooms and Home College test setup and cleanup.
