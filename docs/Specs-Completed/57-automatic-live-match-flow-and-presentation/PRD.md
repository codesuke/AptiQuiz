# PRD #57: Automatic live match flow and presentation

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/57
- Archived: 2026-10-10
- Status: all five slices implemented and closed; browser inspection of motion and audio remains a verification gap.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#58](https://github.com/codesuke/AptiQuiz/issues/58) | Getting ready before Question 1 | Vertical | [slice](slices/58-getting-ready-before-question-1.md) |
| [#59](https://github.com/codesuke/AptiQuiz/issues/59) | Run Questions automatically after each reveal | Vertical | [slice](slices/59-run-questions-automatically-after-each-reveal.md) |
| [#60](https://github.com/codesuke/AptiQuiz/issues/60) | Complete the Match and show final results automatically | Vertical | [slice](slices/60-complete-the-match-and-show-final-results-automatically.md) |
| [#61](https://github.com/codesuke/AptiQuiz/issues/61) | Bring motion to the live Room | Vertical | [slice](slices/61-bring-motion-to-the-live-room.md) |
| [#62](https://github.com/codesuke/AptiQuiz/issues/62) | Add optional live Room sound cues | Vertical | [slice](slices/62-add-optional-live-room-sound-cues.md) |

## Build summary

- The Host starts once. The Game Server runs 3-second Getting ready, the existing 30-second Question window and early closure, then a 6-second reveal. It repeats until the final Question and refuses manual advancement.
- Server deadlines drive Host and Participant countdowns and survive reconnects. Browser timers only display time.
- After the final reveal, Finalizing results remains visible while the Game Server retries a failed save. FINISHED appears only after the database commit, with one saved result per Participant.
- The dedicated results screen shows the top three, full Leaderboard, and each Participant's score, rank, accuracy, Average Effective Response Time, and Topic strengths. The Host gets no fabricated Participant result.
- Framer Motion adds visible phase, roster, answer, rank, and finish transitions with reduced-motion support. Short Web Audio cues and a persisted mute control mark appropriate events after interaction.

## Verification summary

- Game Server public Socket.IO tests used an injected clock and scheduler for automatic phases, stale callbacks, reconnects, refused manual advancement, and failed completion retry. PostgreSQL-backed completion tests verified durable results. Full monorepo lint, typecheck, tests, and build passed after #59 and #60.
- Web lint, typecheck, tests, and build passed after #61; 194 web tests passed. After #62, focused audio tests and all 197 web tests, typecheck, build, and targeted Biome passed.
- A concurrent full monorepo test run after #62 encountered failures in Game Server resume and Room tests while unrelated uncommitted event rate limiting edits were present. Those edits were outside this PRD and were not included in its commits. The earlier full monorepo checks passed before those edits.
- Code review was performed for each slice, and findings were addressed before its issue was closed.

## Known limitations

- Browser-driven desktop, mobile, reduced-motion, and actual audio playback checks could not run because this environment has no installed browser runtime. The corresponding component behavior is covered by tests and the web build.
- Active in-memory Rooms still do not recover after a Game Server process restart; this was explicitly deferred in the PRD.

## Authorship

Derived from implementation commit authors: Codesuke <codesuke@gmail.com> (`2a87f50`, `c5f6e8f`, `4f92b6f`, `f1c15d2`, `73f1b5d`, `1301f23`). The implementation was produced with AI agents under the user's direction.

## Follow-ups

- Run a browser session on desktop and mobile to inspect motion, reduced-motion behavior, audio playback, mute persistence, and no-autoplay behavior.

## Issue snapshot

## Problem statement

A live Match currently pauses after each revealed Question until the Host presses a button. This lets the Host choose when the next Question starts and leaves Participants waiting without a shared countdown. The saved final results appear as a small list alongside the last Round. The live Room has little motion or sound to make changes in competition clear.

## Outcome

After the Host starts a Match, the Game Server runs its remaining phases on fixed server time. The Host and Participants see Getting ready, Question, and reveal countdowns, then a focused final results screen. Short optional sounds and purposeful motion make state changes clear without delaying play.

## User stories

1. As a Participant, I want every Question to start on a server-controlled schedule, so the Host cannot choose my answering window.
2. As a Host, I want to start once and let the Match run, so I can focus on the Room rather than pressing Next.
3. As a returning Participant, I want to recover the current countdown and result, so a reconnect does not change my place.
4. As a Participant, I want a clear finish with my performance and the Room standings, so the competition has a satisfying end.
5. As a viewer, I want control over sound and reduced motion, so the live experience remains comfortable.

## Requirements

- The Host alone starts from the Lobby. Start enters a 3-second Getting ready phase before Question 1. No Answer is accepted during Getting ready.
- An open Question retains the existing 30-second server deadline and early closure when all connected Participants have answered, including the existing reconnect grace. Server receipt time, score rules, and answer secrecy stay authoritative.
- Every closed Question enters a 6-second reveal. The reveal shows the correct option, Round outcome, and cumulative Leaderboard. After a nonfinal reveal, a 3-second Getting ready phase precedes the next Question. The Host cannot advance manually.
- Ready, open, and reveal phases expose server timestamps sufficient for Host and Participant countdowns. A reconnect receives the same phase and deadline. Browsers render countdowns from server time; browser timers never cause a phase change or score decision.
- After the final reveal, the Game Server completes and saves the Match once. A failed save keeps the Room in a visible Finalizing results state and retries automatically with bounded retry frequency. The Room announces FINISHED and broadcasts final results only after durable completion. Repeated attempts do not duplicate or change results.
- The final results take the primary screen for Host and Participants. They highlight the top three, show the full ordered Leaderboard, and show the viewer's score, rank, accuracy, Average Effective Response Time, and Topic strengths when the viewer is a Participant. The Host sees no invented Participant result.
- The live Room uses purposeful motion for roster changes, answer lock, reveal, rank movement, ready transitions, and finish. Motion never delays an actionable Question or conceals game information. Honor reduced-motion preferences.
- Short sound cues mark the last three seconds of countdowns, answer lock, reveal, and final results where appropriate. Sound begins only after viewer interaction. A visible mute control remembers the viewer's choice. No background music. Correctness-specific sound plays only after reveal.
- Keep the existing AptiQuiz visual language and readable mobile layouts. Do not use color or sound alone to communicate a state.

## Acceptance criteria

- [ ] Start announces Getting ready to all Room viewers with the same server deadline; Question 1 opens after 3 seconds without a Host command.
- [ ] The open Question closes at its existing deadline or existing all-answered condition. A late Answer and an Answer during Getting ready are refused.
- [ ] All Room viewers receive the same 6-second reveal window and cumulative Leaderboard. The next Getting ready phase and Question open automatically; no Host action can move or skip a Question.
- [ ] Refreshing or reconnecting in Getting ready, an open Question, or reveal restores the authoritative state and remaining countdown.
- [ ] The final reveal leads to Finalizing results, then FINISHED only after one durable result per Participant is saved. A simulated first save failure recovers automatically without a Host click or duplicate results.
- [ ] Host and Participants see a dedicated final results view with the same saved order and values; the Participant's own metrics are clear, including no-Answer cases.
- [ ] Roster, answer, reveal, rank, and finish transitions provide visible feedback on desktop and mobile; reduced-motion settings remove nonessential animation without hiding information.
- [ ] Sound cues follow the specified events only after interaction; mute persists across refresh and every cue has a visible equivalent.

## Implementation decisions

- Decision: The Game Server owns all phase transitions and countdown deadlines; clients only display them.
  - Rationale: A Host-controlled or browser-controlled timer would reintroduce timing differences.
- Decision: Keep the current early closure and reconnect grace rules.
  - Rationale: Every connected Participant finishing early should not create idle waiting, and a brief disconnect should not prematurely reveal a Question.
- Decision: Keep results invisible as FINISHED until the database commit succeeds, then retry failed completion automatically at a capped interval.
  - Rationale: A displayed result must be durable and the Host no longer has a retry button.
- Decision: Use the existing design tokens and server-provided standings and results.
  - Rationale: Presentation must not invent scores or a new visual system.

## Testing decisions

- Highest useful public test seam: Drive a multi-Question Room through Socket.IO with an injected server clock and scheduler; inspect public events and persisted MatchResult rows in the configured PostgreSQL test server for completion cases.
- Relevant prior tests: Game Server Room, Round, advancement, resume, and Match results tests; web Round, Leaderboard, final results, and countdown tests.
- Behavior that must be verified: Exact phase/deadline progression, refusal of premature Answers and manual advancement, early closure, reconnect snapshots, automatic retry after a failed save, one committed result per Participant, and accessible visual/audio controls.

## Dependencies

- Completed Room, Round, Leaderboard, and final results work in PRDs #4, #5, and #7.

## Out of scope

- Deliberately excluded: Background music, new scoring rules, replaying a finished Room, and a redesign of unrelated app screens.
- Deferred: Recovery of an active in-memory Room after a Game Server process restart; this remains an existing architecture limitation.

## Further notes

- This supersedes the Host advancement behavior recorded in completed PRD #7 and the current `room:advance` flow.
- "Countdowns everywhere" means each phase with a known deadline: Getting ready, open Question, and reveal. Finalizing results has no invented countdown because database completion time is unknown.
