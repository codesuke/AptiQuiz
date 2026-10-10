# PRD #73: Refine the live Participant Room experience

Issue: https://github.com/codesuke/AptiQuiz/issues/73

## Problem Statement

A Participant attending a live Room currently sees the Question beside a wide utility sidebar that can grow with the Participant roster. After reveal, the Participant can see their result and a cumulative Leaderboard, but their own new rank, the Round outcome, and fast correct answers are not surfaced in a focused sequence. The interface should feel competitive and social without exposing correctness, scoring, or timing while a Question is open.

## Solution

Refresh the Participant live Room experience around a Question-first layout and a post-reveal personal-to-shared feedback sequence. Move Room facts and a compact scrollable Participant list below the main quiz area, then make each reveal show the Participant's own result and rank movement before shared fastest-correct, accuracy, and Leaderboard context. Keep all Host controls absent and retain the Game Server's existing authority and secrecy guarantees.

## User Stories

1. As a Participant, I want the Question and answer controls to be the first thing I see during a Round, so that I can focus on answering under time pressure.
2. As a Participant, I want Room facts and the Participant list below the quiz area during active phases, so that they do not compete with the Question for desktop width.
3. As a Participant, I want the active layout to retain its reading order on mobile, so that I can attend a Room without horizontal scrolling.
4. As a Participant, I want to see the Room Participant count beside a compact roster, so that I understand how many people are competing.
5. As a Participant, I want the roster to stop growing after approximately six to eight rows and scroll instead, so that a full Room remains easy to use.
6. As a Participant, I want no Host controls, QR code, or sharing controls in my live view, so that the screen stays relevant to competing.
7. As a Participant, I want my answer to remain locked without revealing whether it is correct while the Question is open, so that the Room stays fair.
8. As a Participant, I want my own correct, wrong, or no-answer outcome to appear first at reveal, so that I immediately understand my Round result.
9. As a Participant, I want to see the points I earned in the revealed Round, so that I can connect my answer with my score.
10. As a Participant, I want my current rank and rank movement shown prominently after reveal, so that I do not need to search the Leaderboard for my position.
11. As a Participant, I want to see the fastest correct Participant and their Effective Response Time after reveal, so that quick accurate answers create a shared competition moment.
12. As a Participant, I want to see how many Participants answered correctly in a Round, so that I can put the difficulty of my outcome in context.
13. As a Participant, I want an explicit no-correct-answer state when nobody is correct, so that no speed winner is misleadingly shown.
14. As a Participant, I want every revealed Leaderboard row to include Round points and cumulative total, so that rank changes are understandable.
15. As a Participant, I want Leaderboard movement to remain readable when motion is reduced, so that I can use the Room comfortably with accessibility preferences enabled.
16. As a Participant, I want completed Results to keep their existing focused presentation without active-Room utilities, so that the end of the match remains clear.

## Implementation Decisions

- This feature applies only to the Participant live Room experience. The Host experience is separately specified, and no Host controls, QR code, copy action, or sharing action appear for Participants.
- During getting-ready, Question, and reveal phases, the layout prioritizes the main quiz area. A below-quiz utility section contains Room facts and a compact Participant roster; it stacks in the same reading order at mobile widths.
- The roster retains the Room Participant count and is constrained to roughly six to eight compact rows before scrolling. It preserves keyboard access and visible focus.
- Open-Question behavior remains deliberately limited to the Participant's answer state. It must not expose the correct option, correctness, Round points, Effective Response Time, other Participants' answer state, or shared Leaderboard data.
- At reveal, the presentation order is: personal result with Round points and prominent current rank/rank movement; shared Round highlights; cumulative Leaderboard.
- Shared highlights name the fastest correct Participant using the lowest server-calculated Effective Response Time among correct answers, and show the count of correct answers. When no Participant is correct, the interface says “No correct answers this Round” and presents no fastest winner.
- The revealed Leaderboard remains ordered by existing authoritative server standings and retains motion-respecting rank-change presentation. Each row shows revealed Round points beside cumulative total.
- The existing revealed Round payload already contains the data required for the Participant highlights. No scoring, Game Server timing, database schema, or migration change is required for this Participant feature.
- The Game Server remains authoritative for scoring, rank order, Effective Response Time, and reveal timing. The browser does not recreate these calculations.

## Testing Decisions

- The primary test seam is the Participant live Room view supplied with phase-specific Room and Round data. Tests assert what a Participant can see and in what sequence rather than internal layout classes.
- Presentation tests cover Question-first active layout, compact scrolling roster, absent Host utilities, personal-result precedence, rank callout, fastest-correct highlight, correct-answer count, no-correct state, and per-row Round points.
- Existing Round-view and Leaderboard presentation tests are prior art for fixtures, own-row identification, stale-view handling, rank movement, and result labels.
- Existing contract and Game Server secrecy tests remain the safety seam for proving that open-Question payloads do not expose correctness, points, timing, or shared Round outcomes.
- Responsive checks cover desktop and the 390px mobile reference width, including no horizontal overflow, keyboard focus, and reduced-motion behavior.
- Tests do not reimplement scoring or ranking; they consume the revealed server data and rely on existing game-engine tests for authoritative scoring and standings.

## Out of Scope

- Adding QR, copy, share, Host controls, or Room-management actions to Participant screens.
- Changing Question answer submission, scoring formulas, Effective Response Time calculation, latency policy, Leaderboard ordering, or tie breakers.
- Exposing any correctness, Round points, timing, other Participant answers, or shared standings before reveal.
- Adding database fields, a migration, analytics, or a new realtime event.
- Redesigning completed Results beyond shared component adjustments required by the Participant live layout.
- Changing the separately planned Host live Room experience.

## Further Notes

The design uses AptiQuiz domain language: Participant, Host, Room, Round, Leaderboard, and Effective Response Time. It preserves the authoritative Game Server model and the existing fairness rule that correctness remains private until reveal. It follows the AptiQuiz visual system while preserving readable contrast, keyboard access, visible focus, mobile layouts, and reduced-motion support.

## Build Summary

- The active Participant Room puts the quiz area first at full width. Room details (College, Join Code, Questions, scoring rule) and a ~7-row scrollable roster with its count sit below it and stack in the same order on mobile. No QR, share, or Host controls appear.
- At reveal, a personal result card (Correct / Wrong / No answer, +Round points, rank "#N of M", movement) comes first. Shared highlights follow (fastest correct with server Effective Response Time, correct count, or "No correct answers this Round"), then the Leaderboard with Round points on each row.
- The Host and Participant views share the roster panels and `RevealHighlights`.

## Verification

- Web 232/232, Game Server 165/165, and database tests passed. Biome lint and typecheck are clean.
- Database and Game Server tests failed once when run together under turbo against the shared PostgreSQL and passed when re-run separately.
- Desktop, 390px, and reduced-motion behavior were checked in render tests only. No live browser Match was replayed.

## Authorship

Codesuke (human). Commit 4f40aed.
