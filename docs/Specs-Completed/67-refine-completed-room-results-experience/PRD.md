# PRD #67: Refine the completed Room Results experience

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/67
- Archived: 2026-10-10
- Status: implemented and closed

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#68](https://github.com/codesuke/AptiQuiz/issues/68) | Refine the completed Room Results presentation | Vertical | [slice](slices/68-refine-completed-room-results-presentation.md) |

## Build summary

- A Participant now sees their total score and rank before the Room standings, together with accuracy, Average Effective Response Time, and Topic strengths.
- The top three retain server order and have distinct first, second, and third placement treatments. A non-consecutive rank remains visible as its actual place.
- The full Leaderboard is compact for large Rooms: each row shows rank, display name, and score, while detailed performance remains in the viewer's own summary.
- The viewer's own row has both visual treatment and accessible current-result semantics. A Host continues to receive no fabricated Participant result.
- Participants can continue to the College League or AptiQuiz home after a completed Room. The Host keeps its existing return-to-hosting navigation.

## Verification summary

- Web suite: 200 tests passed; web TypeScript typecheck, targeted Biome check, and production build passed.
- Component behavior tests cover a Participant summary, compact Leaderboard metrics, Host behavior, finalizing state, a 50-Participant Room, continuation links, and a non-consecutive podium rank.
- An isolated browser preview of the shared Results component was reviewed at desktop and 390px mobile widths.
- Standards and spec reviews found and resolved design-token and non-consecutive podium-rank findings before the slice closed.

## Known limitations

- The browser preview rendered the shared Results component with saved fixture data; it was not a complete authenticated live-Room session.

## Authorship

Derived from implementation commit author: Codesuke <codesuke@gmail.com> (`0cf545f`). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Problem Statement

After a Room finishes, the Results screen contains durable, correct data but does not make the Participant’s outcome immediately clear. The highlighted personal summary omits total score, the full Leaderboard repeats expanded metrics for every Participant and becomes difficult to scan in large Rooms, the podium does not yet feel like a strong completion moment, and a Participant has no explicit next destination after reviewing the Match.

## Solution

Refine the completed Room Results screen so that it leads with a Participant’s own score and performance, celebrates the top three without obscuring the Room standings, keeps a full 50-Participant Leaderboard compact and readable, and provides a clear route to continue using AptiQuiz. Preserve the existing durable Match results, server-calculated values, Host behavior, accessibility, and optional sound behavior.

## User Stories

1. As a Participant, I want my total score displayed prominently in my personal result summary, so that I immediately know my Match outcome.
2. As a Participant, I want to see my rank next to my score, so that I understand my standing in the Room.
3. As a Participant, I want my accuracy, Average Effective Response Time, and Topic strengths retained in my personal result summary, so that I can identify how to improve.
4. As a Participant who gave no accepted Answer, I want an honest unavailable time value and zero-value metrics, so that the screen does not misrepresent my Match.
5. As a Participant outside the top three, I want my personal result visible before the full Leaderboard, so that I do not need to search a long list for it.
6. As a Participant in a Room with up to 50 Participants, I want a compact, scannable full Leaderboard, so that I can compare standings without scrolling through every person’s detailed metrics.
7. As a Participant, I want my row in the full Leaderboard clearly identified visually and semantically, so that I can locate it quickly without relying only on color.
8. As a Participant, I want the top three distinguished by placement and visual hierarchy, so that the Match finish feels recognizably competitive and celebratory.
9. As a top-three Participant, I want my podium card to show my score and indicate that it is mine, so that both achievement and identity are clear.
10. As a Host, I want to see the same saved podium and compact full Leaderboard without a fabricated personal result, so that hosting does not create a false Participant record.
11. As a Host, I want my existing route back to hosting preserved, so that I can leave a finished Room safely.
12. As a Participant, I want a clear next action to return to AptiQuiz, so that the completed Room is not a dead end.
13. As a Participant or Guest, I want access to the public College League from the completed results, so that I can continue to explore current standings regardless of League eligibility.
14. As a keyboard or screen-reader user, I want result hierarchy, own-result identification, standings, and next actions to be understandable without visual cues alone, so that I can use the completed Room experience independently.
15. As a mobile Participant, I want the personal summary, podium, Leaderboard, and actions to remain readable without horizontal scrolling, so that I can understand results on a narrow screen.
16. As a returning Participant, I want the same saved result values and presentation after reconnecting, so that a refresh does not change or hide my outcome.

## Implementation Decisions

- Refine the existing shared completed-Results presentation used by Host and Participant views. Do not change Room completion, persistence, result ordering, Socket.IO events, or the FinalResult contract.
- Make total score a first-class value in the Participant-only personal result summary, together with rank. Keep accuracy, Average Effective Response Time, and Topic strengths there as the expanded performance detail.
- Keep the top-three podium, but give first, second, and third distinct placement treatment while preserving textual place labels and the server-supplied rank order.
- Render the full Leaderboard as compact rows containing rank, display name, and total score. Do not repeat accuracy, response time, or Topic strengths in every row.
- Continue to mark the viewer's Leaderboard row both visually and with accessible current-result semantics. The Host has no viewer Participant id and therefore receives no personal summary or own-row designation.
- Add completed-Results navigation for Participants: a route to the College League and a route back to the AptiQuiz home page. Preserve Host navigation and do not imply that a finished Room can restart.
- Preserve reduced-motion behavior, sound mute controls, finalizing state, no-Participant empty state, and responsive layout behavior.

## Testing Decisions

- Test the shared completed-Results component as the single highest existing seam, supplying saved FinalResult values and a viewer identity. Assert visible behavior and accessible semantics rather than implementation details.
- Cover a Participant outside the top three, a top-three Participant, a Host, no accepted Answers, an empty result list, a Room-sized result list, continuation links, and non-consecutive ranks.
- Perform responsive visual checks at the project mobile reference width and a small laptop viewport.

## Out of Scope

- Changing scoring, ranks, Effective Response Time calculations, Topic strength calculations, persistence, reconnection rules, or College League eligibility.
- Adding Match restart, rematch creation, sharing, result history, answer review, social sharing, badges, prizes, new sound effects, a redesign of unrelated screens, or a new data model.

## Further Notes

This is a post-completion presentation refinement. It builds on durable final-results work and retains the rule that a Host is not automatically a Participant.
