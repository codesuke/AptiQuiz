# PRD #8: College League

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/8
- Archived: 2026-10-10
- Status: all slices implemented, verified, and closed. The PRD issue was closed with the archive.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#39](https://github.com/codesuke/AptiQuiz/issues/39) | Weekly College League and Participant standings | Vertical | [slice](slices/39-weekly-college-league-and-participant-standings.md) |
| [#41](https://github.com/codesuke/AptiQuiz/issues/41) | College standings from captured MatchResults | Vertical | [slice](slices/41-college-standings-from-captured-matchresults.md) |

## Build summary

- **Public weekly League (#39, #41).** `/league` needs no session and is rendered per request, so a refresh shows newly persisted results. It shows the current Monday–Sunday dates with a UTC label, the top 10 Participants (rank, name, every distinct captured College, total) and the top 10 Colleges (rank, name, total), each with a clear empty state. The home footer links to it.
- **Scoring source.** Only persisted MatchResults from #7 count: non-null `userId` and `emailVerifiedAtCompletion = true`. The period is chosen by `completedAt` (inclusive Monday 00:00 UTC, exclusive next Monday). College attribution is the captured `collegeId`, never the current Home College. Zero scores count. Guests and unverified Users play and see Room results but earn no League points.
- **Order.** Score descending, then display name (Participants) or College name, then stable id, using byte-order collation so every server agrees; ranks are sequential and the limit of 10 applies after aggregation.
- **New exports:** `getCollegeLeague`, `leaguePeriodAt`, `LEAGUE_TABLE_SIZE`, and the `CollegeLeague`, `ParticipantStanding`, `CollegeStanding` and `LeaguePeriod` types. No schema change or migration.
- **Web (kept minimal on request):** two plain accessible tables. The web package gained a `vitest.config.ts` (automatic JSX runtime and the `@/` alias) so `.tsx` tests run.

## Verification summary

- **Automated:** workspace typecheck passes; database 63 (against the configured PostgreSQL), web 194; Biome is clean.
- **`code-review` (Standards and Spec), run per slice.** Fixed: raw query rows now Zod-validated (non-negative integers), a page-level test was added, and shared week constants were deduplicated in the database package. Dispositioned as judgement calls: the two queries are not in one snapshot, so a Room completing between them could briefly make the tables disagree; the Participant table has no `<h2>` while Colleges has one; the display name is the User's current name; the footer link is the only navigation on the home page.
- **Not run:** the page was not opened in a browser, so mobile layout and keyboard use are checked only by markup.

## Known limitations

- Display names come from the User's current `name`, because MatchResult stores none.
- Ordering by byte-order collation sorts upper-case before lower-case names.
- The two League queries run in parallel without a shared snapshot.
- There are no monthly or all-time periods, no Admin voiding (#9), and no live updates; a refresh is required.
- A 50-Participant Match is not load-tested (#10).

## Authorship

Derived from commit authors on `main`. The implementation was produced with AI agents under the user's direction.

- Codesuke <codesuke@gmail.com>: `5a4a985` (#39, #41).

## Follow-ups

- #9: Admin voiding and restoring League points.
- Consider a stored display-name snapshot on MatchResult and a shared transaction for the two queries.

## Issue snapshot

## Problem Statement

A Participant can see a Room Leaderboard and final result, but cannot see how completed Rooms add up across the week. Colleges also cannot see how their Participants' results compare with other Colleges. Without a clear period, eligibility rule, and stable College attribution, the College League could show misleading totals.

## Solution

Provide a public College League page for the current Monday–Sunday UTC week. Show the week's date range, the top 10 eligible Participants, and the top 10 Colleges. Add points from each completed Room result once. A Participant earns points only when the result records a signed-in User whose email was verified at match completion. Attribute each result to the College recorded when that Participant played. Guests and unverified Users still play and see their Room results, but their scores do not enter either League table.

## User Stories

1. As a visitor, I want to open the College League without signing in, so that I can follow the competition.
2. As a visitor, I want to reach the College League from the main application navigation, so that I can find it without a direct link.
3. As a visitor, I want to see that the League Period is this week in UTC, so that I know which results are counted.
4. As a visitor, I want to see the Monday and Sunday dates for that week, so that the period is unambiguous.
5. As a Participant, I want each eligible completed Room to add to my weekly score, so that repeated play contributes to my standing.
6. As a Participant, I want my total score shown with my rank, so that I can understand my position.
7. As a Participant, I want equal scores ordered consistently, so that ranks do not change arbitrarily between visits.
8. As a Participant who played for more than one College in a week, I want my single weekly score to include every eligible result, so that changing Home College does not split my Participant standing.
9. As a Participant who played for more than one College in a week, I want the Colleges represented by my results shown, so that my Participant row does not imply all points went to one College.
10. As a College representative, I want my College's score to include the eligible results attributed to it, so that its standing reflects completed Rooms.
11. As a College representative, I want my College's rank and score shown, so that I can compare it with other Colleges.
12. As a College representative, I want results to stay with the College recorded when the Participant played, so that a later Home College change does not rewrite past standings.
13. As a verified User, I want verification at match completion to determine eligibility, so that later account changes do not silently recalculate an earlier result.
14. As an unverified User, I want to see my Room result even when it earns no League points, so that I can still review my play.
15. As a Guest, I want to see my Room result even when it earns no League points, so that I can still review my play.
16. As a visitor, I want a clear empty state when no eligible results exist this week, so that an empty table is not mistaken for a failure.
17. As a visitor on a phone, I want both tables, ranks, scores, and College names to remain readable, so that I can follow the League without horizontal scrolling.
18. As a visitor, I want refreshed standings to include newly completed Rooms, so that the page reflects the latest persisted results.

## Implementation Decisions

- Use completed MatchResults persisted by #7 as the only scoring source. The League reads their captured User id, verified status, College id, total score, and completion timestamp. It does not reconstruct scores from live Room state or current account fields.
- A Counted Match is one persisted Participant result from a completed Room with a non-null User id and verified status captured as true at match completion. A score of zero is still an eligible result. A Guest or unverified result is excluded from both tables.
- The current League Period is determined at request time in UTC. It begins Monday at 00:00:00 UTC and ends at the next Monday at 00:00:00 UTC, with an inclusive start and exclusive end. Display the Monday through Sunday calendar dates and the UTC label. A result is assigned to the period by its persisted match completion timestamp, not Room creation or join time.
- Sum eligible result scores by User id for the Participant table. A User appears once even after completing multiple Rooms. Show the User's display name, total score, rank, and the distinct College names recorded by their counted results. If the User represented multiple Colleges during the week, show all of them in that row rather than substituting the current Home College.
- Sum eligible result scores by captured College id for the College table. A User's results may contribute to different Colleges if the recorded College changed between Rooms. The College table shows each College name, total score, and rank.
- Return the top 10 rows in each table. Order by total score descending, then display name ascending, then stable id ascending to resolve identical names. Ranks are sequential row positions after this deterministic order. Apply the limit only after aggregation and sorting.
- The page is public and needs no session. It queries durable results when requested; a refresh can show newly completed Rooms. No realtime subscription or cached score counter is required.
- Preserve #7's unique result per Room and Participant and idempotent completion write. League queries must not create points or count the same result twice.
- Use the existing web application and database boundary for the query and page. Use the established visual language and responsive, accessible table presentation.

## Testing Decisions

- Test externally observable totals, eligibility, period boundaries, attribution, order, and rendered page state. Do not test private query steps, database query shape, or component internals.
- The primary seam is a database-backed College League query over persisted completed MatchResults using the configured PostgreSQL test server. Seed realistic Rooms and results, call the public query with an injected or explicit current time, and assert both tables.
- Add one page-level behavior check for public access, the displayed UTC date range, both tables, and the empty state. Keep this at the highest practical web rendering seam rather than duplicating every query case in UI tests.
- Follow the existing database-backed Rooms and Home College tests for fixture setup and cleanup, and the existing web page behavior tests for render assertions. #7's completion-flow tests remain the prior art for proving idempotent result persistence.
- Cover two Rooms in one week, different Colleges, a single User changing Home College between matches, Guests, unverified Users, zero scores, exact Monday boundaries, the next Monday exclusion, equal-score ordering, more than 10 entries, an empty week, and a repeated completion attempt.

## Out of Scope

- Monthly and all-time League Periods; seasons; live score push; a minimum verified Participant threshold; a best-per-Question-Set rule; College averages; Pending College points; Guest score claiming; Admin voiding or manual score edits; changes to Room scoring or final result metrics.

## Further Notes

- Depends on #1 Accounts, #2 Colleges, and #7 Leaderboard & Final Results. #7 must persist User identity, verified status, College, score, and completion time before this League can count results.
- Acceptance criteria:
  - [x] A public visitor can open the College League and see this week's Monday–Sunday dates with a UTC label.
  - [x] Two eligible completed Rooms in the same period add to one Participant total and their captured College totals.
  - [x] One User appears once in the Participant table even when their counted results name different Colleges; each College receives only its attributed results.
  - [x] A Guest or unverified User remains visible in Room final results but contributes to neither League table.
  - [x] Verification or Home College changes after match completion do not change earlier League eligibility or College attribution.
  - [x] A result at Monday 00:00 UTC is included; a result at the next Monday 00:00 UTC is excluded.
  - [x] A zero-score eligible result appears with zero points; an empty period has a clear empty state.
  - [x] Participant and College tables each show at most 10 rows, ordered deterministically with stable ranks and scores.
  - [x] Retrying match completion does not add points again.
  - [x] The page is readable and keyboard accessible at desktop and mobile widths.
