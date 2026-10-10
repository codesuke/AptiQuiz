# PRD #7: Leaderboard & Final Results

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/7
- Archived: 2026-10-10
- Status: all slices implemented, verified, and closed. The PRD issue was closed with the archive.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#40](https://github.com/codesuke/AptiQuiz/issues/40) | Show the Leaderboard after each Round | Vertical | [slice](slices/40-show-the-leaderboard-after-each-round.md) |
| [#42](https://github.com/codesuke/AptiQuiz/issues/42) | Save completed Room results once | Horizontal | [slice](slices/42-save-completed-room-results-once.md) |
| [#43](https://github.com/codesuke/AptiQuiz/issues/43) | Show final results to the Room | Vertical | [slice](slices/43-show-final-results-to-the-room.md) |

## Build summary

- **Leaderboard (#40).** Every revealed Round carries the same cumulative standings for the Host and all Participants: total score, rank, and movement since the previous Round (neutral after Round 1). Ranking is a total order: score, then summed Effective Response Time of correct Answers, then join time, then Participant ID. The standings ride inside the revealed `round:state` view, so returning viewers recover them from the host and join acknowledgements. The engine `LEADERBOARD` phase is not used on the wire; the Host still advances from `QUESTION_REVEAL`.
- **Durable completion (#42).** Advancing after the last Round computes final metrics (rank, score, accuracy over all Room Questions, mean Effective Response Time over all accepted Answers, per-Topic correct/total) and commits one MatchResult per joined Participant with the Room completion time in one transaction. The Room is announced `FINISHED` only after the commit; retries and concurrent attempts return the first committed rows. Results snapshot the User id, verification status read at completion, and the Participant's College.
- **Final results (#43).** The lobby snapshot carries `results` once the Room is finished and saved, and the Host and Participants see rank, score, accuracy, "Average Effective Response Time" (— when none), and Topic strengths.
- **New contracts:** `leaderboardEntrySchema`, `leaderboard` on the revealed view, `finalResultSchema`, `topicStrengthSchema`, and optional `results` on the lobby snapshot. **New exports:** `rankStandings`, `summarizeMatch`, `completeRoom`. **Migration:** `20261010104709_match_result_snapshot`.
- **Web (kept minimal on request):** a plain Leaderboard table in the reveal and a plain Final results list; the per-Round scores table was removed.

## Verification summary

- **Automated:** typecheck passes across the workspace. Game Server 157, database 48 against the configured PostgreSQL, Game Engine 36, contracts 2, web components and lib 181. Biome is clean on the touched packages.
- **Staged-tree check:** the web commit was verified in an isolated export of the index (typecheck, Biome, 181 web tests) because the shared tree held other sessions' uncommitted work.
- **`code-review` (Standards and Spec).** No hard standards breach and no missing requirement. Judgement calls dispositioned: duplicated topic shape and `isOwnRow` helpers, the `totalAnswers` / `questionCount` / `totalQuestions` naming, and `rooms.ts` size were deferred; the unused engine `LEADERBOARD` phase is an accepted deviation.
- **Not run:** an end-to-end browser Match. The screens were not viewed in a browser.

## Known limitations

- The Leaderboard and final results are not rendered in a browser-verified session; the UI is deliberately minimal.
- `MatchResult.totalAnswers` holds the Room's Question count (the accuracy denominator); the name is misleading.
- `markRoomFinished` in `@aptiquiz/database` is now unused by the Game Server (only its old test calls it).
- The score-tie and join-time tie-breaks cannot be reached through the Socket.IO flow with the current scoring buckets; they are covered by engine unit tests.
- Live Rooms remain in memory; a Game Server restart loses an active Match. Completed results are durable.
- The migration adds NOT NULL columns without defaults; it assumes `MatchResult` was empty.
- A 50-Participant Match is not load-tested (#10).

## Authorship

Derived from commit authors on `main`. The implementation was produced with AI agents under the user's direction.

- Codesuke <codesuke@gmail.com>: `7be6167` (#40 server), `694f0c0` (#42, #43 server), `9d101b9` (#40, #43 web).

## Follow-ups

- #8: College League aggregation from the saved MatchResults.
- #9: Admin voiding of completed Room points.
- #10: the 50-Participant Match load proof.
- Remove `markRoomFinished` and rename `totalAnswers` when next touching these models.

## Issue snapshot

## Problem Statement

Participants can see the result of a Round, but they cannot see how that result changes their place in the Room or understand their performance when the match ends. The College League also needs one durable, trustworthy result per Participant from each completed Room.

## Solution

After every revealed Round, the Host and Participants see the same server-calculated Leaderboard: total score, rank, and movement since the previous Round. After the final Round, they see final Room results with each Participant's score, accuracy, average Effective Response Time, and Topic strengths. The Game Server completes the Room once and saves one immutable result per Participant for the College League.

## User Stories

1. As a Participant, I want to see the Leaderboard after each Round, so that I know my standing before the next Question.
2. As a Host, I want to see the same Leaderboard as Participants, so that I can guide the Room through the match.
3. As a Participant, I want to see everyone's total score, so that I understand the standings.
4. As a Participant, I want to see my rank, so that I know where I stand.
5. As a Participant, I want to see who moved up or down since the previous Round, so that I understand the effect of that Round.
6. As a Participant, I want the first Round to show a neutral movement state, so that it does not imply an earlier rank.
7. As a Participant, I want equal scores ordered consistently, so that every screen shows the same standing.
8. As a Participant, I want wrong and unanswered Questions reflected fairly in the standings, so that scores match the published rules.
9. As a Host, I want to advance only after the Leaderboard appears, so that everyone has time to see the Round outcome.
10. As a Participant, I want to see the current standings when I rejoin an active Room, so that I do not depend on a missed broadcast.
11. As a Host, I want the final Leaderboard followed by completed results, so that the match has a clear end.
12. As a Participant, I want my final total score and rank, so that I know how I finished.
13. As a Participant, I want my accuracy across the Room's Questions, so that unanswered Questions are included in my performance.
14. As a Participant, I want my average answer speed labelled as Effective Response Time, so that I understand which timing measure was used.
15. As a Participant who submitted no Answers, I want the average time shown as unavailable, so that it does not imply I answered instantly.
16. As a Participant, I want Topic strengths shown as correct answers out of Questions in each Topic, so that I can see where I did well and where I need practice.
17. As a Guest, I want my Room results shown even though I do not have a User account, so that I can review the match I played.
18. As a signed-in User, I want my result linked to my User identity and the College I represented in the Room, so that eligible points can later count in the College League.
19. As an unverified User, I want my Room result shown while its verification status remains accurate, so that it is not incorrectly counted in the College League.
20. As a Participant, I want match completion retries to preserve the same results, so that my score is never counted twice.
21. As a Participant, I want a completed result to stay associated with the College and verification status recorded at completion, so that later account changes do not rewrite match history.
22. As a Host, I want a failed result save to be retried safely before the Room is marked complete, so that a displayed completion has durable results.

## Implementation Decisions

- Extend the existing Game Engine phase sequence: Question reveal leads to Leaderboard; only the Host's existing advance command moves beyond it. Advancing the final Leaderboard completes the Room rather than opening another Round. Keep timing, score, and phase decisions on the Game Server.
- Calculate a cumulative Leaderboard from server-accepted Answers in closed Rounds and the Room's joined Participants. A correct Answer contributes its awarded points; an incorrect or unanswered Question contributes zero. Do not recalculate points in the browser.
- Rank by total score descending, then the sum of Effective Response Times for accepted correct Answers ascending, then Lobby join time ascending. Use Participant ID ascending only when those values are identical, so the order is total and stable. The Game Server sends the ordered standings to all viewers.
- Rank movement is previous completed Round rank minus current rank; positive means climbed, negative means dropped, and zero means unchanged. The first Round has no previous rank and shows neutral movement. Every joined Participant stays in the standings, including those who disconnect or answer nothing.
- Define accuracy as correct Answers divided by the number of Questions in the completed Room, including unanswered Questions in the denominator. Show both the count and percentage; with a nonempty Question Set, the denominator is never zero.
- Define average response time as the arithmetic mean of Effective Response Times for all accepted Answers, correct and incorrect, rounded to the nearest millisecond. It is unavailable when a Participant submitted no accepted Answers; the interface shows “—”, not zero.
- Define Topic strengths for every Topic represented in the Room's Question snapshot as correct Answers out of Questions in that Topic, with unanswered Questions included. Show the count and percentage, including zero-correct Topics. Use the Room's Question snapshot so later Question Set edits cannot change results.
- Show final results for every joined Participant, including Guests and those who submitted no Answers. The Host sees the same results; hosting alone does not create a Participant result.
- Extend shared runtime-validated Socket.IO contracts for Leaderboard, completion, and return/rejoin snapshots. Both Host and Participant interfaces render the server payload; a returning connection gets the current phase's Leaderboard or final results instead of relying on an earlier event.
- Persist the Room completion timestamp and one MatchResult per Participant in a single database transaction. Use the existing Room and Participant identity, College, Answer, and MatchResult models; extend MatchResult with immutable User ID and email-verified-at-completion values. A Guest has a null User ID and is ineligible for League points. A signed-in Participant's stored College is the College attached to that Participant for this Room, not a later Home College. Read verification status at completion rather than trusting an old Socket Ticket.
- Keep the existing unique Room/Participant result constraint and make completion idempotent. A retry must return the same committed results without creating or changing rows or applying points again. Do not mark or announce the Room as finished until its results commit; a storage failure remains retryable.
- Store enough completed result data for #8 to calculate College League totals using the recorded User ID, verification status, College, score, and completion time. #8 owns League aggregation and eligibility queries.

## Testing Decisions

- Test externally visible behavior at the highest useful seam: drive a multi-Round Room through the Game Server's Socket.IO commands and events, then inspect its persisted Room and MatchResult records in the configured PostgreSQL test server. Reuse the current Room, Round, reveal, and Answer harnesses. Use focused exported Game Engine tests only for ranking and metric boundaries that are difficult to distinguish through the match flow.
- Assert that two Rounds with different winners change ranks and movement; Host and connected Participants receive identical ordered standings; the first Round has neutral movement; a returning viewer receives the current snapshot.
- Assert score ties break by total correct-Answer Effective Response Time, then join time, then Participant ID when timestamps are equal. Assert incorrect and unanswered Answers add no points and disconnected Participants remain listed.
- Assert final accuracy, average time, and Topic counts for correct, incorrect, unanswered, multi-Topic, and no-Answer Participants. Verify Guest results are visible and saved without a User ID.
- Assert only the Host can advance, the final advancement produces one completed Room, and repeated or concurrent completion attempts leave one unchanged result per Participant. Assert a failed transaction does not claim completion and a retry succeeds.
- Assert saved User ID, verification status at completion, Participant College, and completion time survive later Home College or email-verification changes. Verify the result fields #8 needs can be queried from PostgreSQL.
- Good tests assert public events, rendered outcomes where relevant, and durable records; they do not couple to private sorting helpers, timers, or component state. Prior art includes the Game Server Room/Answer/reveal integration tests, exported Game Engine scoring tests, and database-backed Room tests.

## Out of Scope

- Per-Question review or explanations, projector animation, faculty analytics, and exports.
- Resume Token issuance or Guest identity recovery across disconnected sockets; #6 owns that mechanism. This spec returns the current standings to an identity that can already rejoin.
- College League tables and aggregation (#8), Admin voiding (#9), and full 50-Participant match load proof (#10).
- Redis, Kafka, and multi-process live Room recovery.

## Further Notes

- Depends on #5 for Round closure, reveal, Host advancement, and final phase handling. #1 and #2 supply User verification and College identity already used by Room and Participant records.
- The existing MatchResult model has a unique Room/Participant key but does not yet store the User ID or verification snapshot. Its average-response field currently requires a value, so the no-Answer case needs a nullable value or equivalent explicit availability representation.
- Existing live Room state is in one Game Server process; an active Room can be lost if that process restarts. Completed results are durable in PostgreSQL.
