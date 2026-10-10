## Final PRD snapshot

# Improve the live Host Room roster, reveal ranking, and QR presence

https://github.com/codesuke/AptiQuiz/issues/69

## Problem Statement

A Host running a live Room sees the Participant roster expand the side card as more Participants join. During a Round, the narrow desktop side rail competes with the Question for space, and the Host cannot see an explicit per-Round indication of who answered correctly and fastest. The Join QR code disappears after the Lobby even though it is a useful event artifact during the match.

## Solution

Refresh the Host live Room presentation so the Question remains the focal area, the Participant roster is compact and independently scrollable below the Round content, and each reveal makes correct, quick answers legible without changing the authoritative scoring model. Keep a compact QR-based Room details panel visible throughout active match phases, with clear language that joining has closed.

## User Stories

1. As a Host, I want the Participant roster to remain a stable size as Participants join, so that a full Room does not stretch the live Room screen.
2. As a Host, I want to see the total Participant count with the roster, so that I can understand Room attendance even when the list scrolls.
3. As a Host, I want the live Question to use the available desktop width, so that I can scan the prompt and options quickly.
4. As a Host, I want the Participant roster below the Round content during getting-ready, Question, and reveal phases, so that it does not compete with the Question in a narrow side rail.
5. As a Host on a small screen, I want the live sections to stack in a readable order, so that no horizontal scrolling is required.
6. As a Host, I want the Participant list to show approximately six to eight compact rows before scrolling, so that it remains quickly scannable at the 50-Participant limit.
7. As a Host, I want the cumulative Leaderboard to animate into its updated order at each reveal, so that score and rank changes are easy to follow.
8. As a Host, I want each revealed Leaderboard row to show the points earned in that Round beside the cumulative total, so that I can connect an answer outcome with the standings change.
9. As a Host, I want a reveal highlight naming the fastest correct Participant and their Effective Response Time, so that correct speed has a visible moment without relying on browser click time.
10. As a Host, I want to see how many Participants answered the Round correctly, so that I can understand the Round outcome at a glance.
11. As a Host, I want an honest no-winner state when no Participant is correct, so that the interface never presents an invalid fastest result.
12. As a Host, I want the QR-based Room details panel to remain visible while the match is running, so that the screen feels event-ready and the Join Code remains easy to share as a reference.
13. As a person viewing the Host screen, I want the active QR panel to state that joining is closed, so that I am not misled into expecting a scan to enter an in-progress Room.
14. As a Participant, I want no correct-answer or response-time information revealed while a Question is open, so that the match remains fair.
15. As a Host viewing final Results, I do not want an active-match QR panel, so that the completed Room remains focused on its Results and next actions.

## Implementation Decisions

- This feature applies to the Host live Room experience only. Participant Question and answer views remain unchanged.
- In active phases, the desktop hierarchy is Question, then reveal highlights and cumulative Leaderboard when applicable, then a utility row containing compact Room details with the QR code and the Participant roster. At mobile widths these areas stack in that order.
- The Lobby keeps its existing pre-match sharing treatment. The active Room details panel appears during getting-ready, Question, and reveal phases, and explicitly communicates: “Match in progress — joining is closed.” It is absent from completed Results.
- The active Participant roster keeps the Room Participant count and uses a constrained scroll container sized for approximately six to eight compact rows. It remains keyboard accessible and retains readable visible focus behavior.
- The existing authoritative score order remains unchanged: cumulative score determines Leaderboard order, with the established server-side tie breakers. The interface does not introduce a client-side ranking rule.
- At reveal only, the Host-facing Round data exposes the information needed to identify the correct answer with the lowest server-calculated Effective Response Time and to calculate the count of correct answers.
- Fastest correct always means the lowest Effective Response Time among correct answers in that revealed Round. Browser-observed click timestamps are never used.
- Each reveal presents the fastest-correct name and time plus a correct-answer count. When the count is zero, it presents “No correct answers this Round” and does not render a fastest-correct winner.
- The cumulative Leaderboard preserves its motion-respecting order-change animation and adds the newly revealed Round points beside each Participant total. It uses revealed server data rather than recreating scoring in the browser.
- Correctness, Round points, and response-time data remain unavailable in open-Question views. The Game Server remains the authority for timing, scoring, and reveal timing.
- No schema migration or scoring-formula change is required. The work extends the post-reveal contract and Host presentation.

## Testing Decisions

- The primary behavior seam is the Host live Room view supplied with phase-specific Room and Round data. Tests assert externally visible placement, phase visibility, labels, scrollable roster behavior, reveal highlights, and no-winner presentation rather than CSS implementation details.
- Contract and Game Server behavior tests assert that required timing data is available in a revealed Host payload and is not exposed while a Question is open.
- Presentation tests verify cumulative order and revealed Round-points display using the existing Leaderboard fixtures and movement behavior as prior art.
- Tests verify that a fastest-correct highlight derives from the smallest revealed server Effective Response Time among correct answers, and that an all-incorrect Round produces no fastest winner.
- Responsive behavior is verified at a desktop width and the project 390px mobile reference width. Checks confirm that active sections stack without horizontal overflow and that reduced-motion preferences remain respected.
- Existing game-engine scoring and standings tests remain the source of truth for points, rank order, and tie breakers; this feature adds no duplicate scoring logic to the web application.

## Out of Scope

- Changing the scoring formula, Effective Response Time calculation, latency policy, or Leaderboard tie breakers.
- Letting Participants join a Room after the Host starts it.
- Changing Participant answer screens or exposing other Participants' live answer state before reveal.
- Adding a new persistent data model, database migration, or analytics system.
- Adding the QR panel to completed Results.
- Redesigning the Lobby or completed Results beyond any shared component adjustments needed for the active Host layout.

## Further Notes

The design uses AptiQuiz domain terms: Host, Room, Participant, Round, Leaderboard, and Effective Response Time. It follows the existing server-authoritative architecture and preserves the requirement that correctness is not disclosed before reveal. The work reuses the established warm AptiQuiz visual system, preserves keyboard access and visible focus, and honors reduced-motion preferences.

## Build summary

- #70 (a2d3290): revealed Round scores carry the server Effective Response Time.
- #71 (d1277c1): Question-first active Host layout with QR Room details and a scrollable roster.
- #72 (2c32d7e): fastest-correct and correct-count highlights, Round points per row, rank-reorder motion.

## Verification

- Contracts 6/6, Game Server 165/165, Web 215/215 tests; workspace typecheck and Biome lint pass.
- Fixture renders at 1440px and 390px; no full live authenticated Match was played in a browser.

## Authorship

Codesuke (@codesuke), human. Co-authors: none.

## Follow-ups

- The rank-reorder motion lives in the shared Leaderboard row, so Participants also see the slide on reveal (Round points stay Host-only).
- The large Host countdown makes the Question text wrap narrowly at 390px.
