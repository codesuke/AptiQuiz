# PRD #10: 50-Participant Simulator & Proof

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/10
- Archived: 2026-10-10
- Status: all slices implemented, verified, and closed. The PRD issue was closed with the archive.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#44](https://github.com/codesuke/AptiQuiz/issues/44) | Simulate an authorized Room and 50-Participant Lobby | Vertical | [slice](slices/44-authorized-room-and-50-participant-lobby.md) |
| [#45](https://github.com/codesuke/AptiQuiz/issues/45) | Simulate multi-Question Answers and reveal checks | Vertical | [slice](slices/45-multi-question-answers-and-reveal-checks.md) |
| [#46](https://github.com/codesuke/AptiQuiz/issues/46) | Prove a completed 50-Participant match with resume and Leaderboards | Vertical | [slice](slices/46-completed-match-with-resume-and-leaderboards.md) |
| [#47](https://github.com/codesuke/AptiQuiz/issues/47) | Record the deployed 50-Participant proof | Horizontal | [slice](slices/47-record-the-deployed-50-participant-proof.md) |

## Build summary

- **One command, one scenario.** `pnpm simulate` creates a fresh starter Room through the web app as a signed-in Host (or uses a supplied Room and Host ticket), joins 50 virtual Guests by default (1 to 50), plays all three Questions through the public Socket.IO commands, and prints a JSON report. It exits nonzero on any setup, join, scoring, secrecy, resume, Leaderboard, result, or timeout failure.
- **Cohorts.** Fixed cohorts submit correct, wrong, new-key duplicate, exact-key replay, and late Answers. The correct cohort answers last so duplicates are sent while the Round is still open; a silent late cohort holds the first Round to its deadline.
- **Checks.** Question content against the starter fixture; revealed points and score tables; pre-reveal payload scan for correctness, explanation, or points; mid-Round resume comparisons; identical ordered Leaderboards for all viewers matched to revealed points; saved results matched to totals; a Participant's Host command refused.
- **Report.** Connected and joined counts, Answer and rejection counts, resumes, Leaderboard convergence, timing constants, and client-observed p50/p95/max latency with sample counts. Host cookie, Host ticket, and Resume Tokens are scrubbed.
- **Deployed proof.** README section "50-Participant proof" records the run on 2026-10-10 14:56 UTC: exit 0, 50 Participants, 3 Questions, 15 of 15 resumes, 50 results, no disclosure in 2,269 payloads.

## Verification summary

- **Automated:** simulator 66 unit tests, Biome, and typecheck pass.
- **Local:** 5- and 50-Participant runs exit 0 against a running web app and Game Server. A bad Host session fails before connecting; a count of 51 is refused; killing the Game Server mid-run exits 1 with a timeout error.
- **Deployed:** the final code (`12a9eaa`) passed at the default 50 against `game.aptiquiz.codesuke.in`; an earlier run on `7298213` also passed.
- **`code-review` (Standards and Spec):** fixed the invariant counter stopping at the reporting cap, unscanned Answer, start, and Host acknowledgements, the missing Host-only refusal check, the unscrubbed Host ticket, and stale README status lines. Dispositioned as judgement calls: `match-run.ts` is large and could be split into round driving, assertions, and resume; the 500–1000 point bounds restate the scoring rule; `connectedSockets` and `joinedParticipants` cannot differ because a failed join aborts the run; `lastAnswerAckToReveal` is an extra metric that reads one shared timestamp.

## Known limitations

- One Room only. Many Rooms, more than 50 Participants, restart recovery, other networks, and browser load are out of scope and untested.
- Late Answers are rejected as `round_not_open` in practice; the `answer_too_late` path is not exercised by this run.
- Server hardware for the deployed run is not visible to the runner.
- The deployed run used a throwaway production Host and left its Room, results, and account in the production database.

## Authorship

Derived from commit authors on `main`: Codesuke <codesuke@gmail.com> (`c4c82fd`, `ec42947`, `7298213`, `12a9eaa`, `69495fb`). The implementation was produced with AI agents under the user's direction.

## Follow-ups

- Delete the throwaway production Host account and its Rooms if unwanted.
- Test many concurrent Rooms before claiming wider capacity.

## Issue snapshot

## Problem Statement

The project must demonstrate that one complete Room works with 50 Participants, not merely that 50 sockets can connect. The current simulator verifies connection and `time:ping` only. Without a retained full-match script, invariant checks, and a recorded deployed run, the team cannot make a supported 50-Participant claim or reproduce a failure.

## Solution

Extend `pnpm simulate` to run a fresh, multi-Question Room through the same public Socket.IO commands and events that browsers use. An authorized Host starts and advances the Room; 50 independent virtual Participants join, answer, disconnect, resume, and finish. The simulator checks gameplay and secrecy invariants, prints a structured report with timing measurements, and exits nonzero on failure. Run it locally and against the deployed Game Server, then record the deployed environment, command, date, and actual result in the README.

## User Stories

1. As a maintainer, I want one documented command to run a full Room simulation, so that I can repeat the 50-Participant proof.
2. As a maintainer, I want the simulator to target a configurable Game Server URL, so that the same scenario can test local and deployed servers.
3. As a maintainer, I want to choose a Participant count up to the Room limit, so that I can reproduce a failure with a smaller run.
4. As a maintainer, I want the default count to be 50, so that the standard run tests the advertised limit.
5. As a Host, I want the simulator to use an authorized Room and Host identity, so that the proof exercises normal product rules.
6. As a maintainer, I want the seeded starter Question Set used for a fresh multi-Question Room, so that the run is reproducible.
7. As a maintainer, I want 50 distinct Participants to connect and join the same Lobby, so that a connection count cannot be mistaken for a Room capacity proof.
8. As a maintainer, I want the simulator to verify the Lobby reaches the requested Participant count before starting, so that every virtual Participant is included.
9. As a maintainer, I want correct and wrong Answers submitted in each run, so that both scoring paths are exercised.
10. As a maintainer, I want duplicate Answers deliberately submitted after accepted Answers, so that the one-Answer rule is checked under load.
11. As a maintainer, I want deliberately late Answers submitted after a server deadline, so that rejection is checked under load.
12. As a maintainer, I want some Participants to leave and resume during an open Round, so that identity and score continuity are proved.
13. As a Participant, I want a resumed connection to keep the same Round state and remaining server time, so that reconnecting cannot extend my opportunity to answer.
14. As a Participant, I want no pre-reveal event or snapshot to identify the correct option or show an explanation, so that other Participants cannot get advance information.
15. As a Participant, I want one score per Round from my first accepted Answer, so that duplicate and late attempts cannot increase my total.
16. As a Host, I want the Room to advance through all starter Questions and finish, so that the proof covers a complete match.
17. As a Participant, I want all connected viewers to receive the same ordered Leaderboard after each Round, so that standings converge.
18. As a maintainer, I want final Room results to agree with the observed Round scores, so that completion does not change the match outcome.
19. As a maintainer, I want a report of connections, Answers, rejections, resumes, errors, and latency percentiles, so that the result can be interpreted later.
20. As a maintainer, I want timeouts and invariant failures to produce a nonzero exit code, so that a stalled or incorrect run cannot be recorded as a pass.
21. As a reviewer, I want the README to state the deployed run's date, hardware, configuration, command, and actual result, so that I can assess the 50-Participant claim.
22. As a maintainer, I want setup credentials and Resume Tokens kept out of reports and logs, so that proof does not disclose access to accounts or Rooms.

## Implementation Decisions

- Extend the existing simulator rather than adding a separate harness. Keep `pnpm simulate` as its entry point. Use shared, runtime-validated contracts and the public Socket.IO interface for Host and Participant actions; do not call Game Server internals or write gameplay state directly to PostgreSQL.
- Use a fresh Room made through the authorized web Room creation path with the seeded starter Question Set and a signed-in Host with a Home College. Obtain a fresh Socket Ticket through the authorized web path before the Host connects. The runner may accept a pre-created fresh Room and Host ticket for manual setup, but must validate that they refer to the expected starter Room and must not bypass Host authorization. Keep session material, Socket Tickets, and Resume Tokens out of printed reports and README examples.
- Give each virtual Participant its own Socket.IO connection, display name, join idempotency key, and later Resume Token. The default requested count is 50; reject invalid counts and counts above the Room's 50-Participant limit before a run. Count joined identities from the public Lobby state, not just successful handshakes.
- Use all Questions in the seeded starter set, which currently contains three Questions. Derive intended correct and wrong choices from the known starter fixture and the public option text/opaque option ids delivered to each Participant. Fail clearly if the Room's Question content does not match that fixture. Never depend on a pre-reveal correct-option field from the Game Server.
- Assign deterministic cohorts so each run includes correct, wrong, duplicate, deliberately late, and unanswered cases. Keep a Participant unanswered until the deadline in at least one Round so early closure cannot invalidate the late-Answer check. Send a duplicate with a new idempotency key after an accepted Answer; treat an exact-key replay separately from a new duplicate attempt.
- During an open Round, disconnect a nonzero subset of Participants, reconnect them with their Resume Tokens, and compare Participant id, prior score, Answer state, public Question, and unchanged deadline. Require them to receive later Room events and appear once in the roster and final results.
- Inspect all pre-reveal Participant and Host messages used in the run, including join/resume snapshots and Answer acknowledgements, for any correct-option marker, correctness disclosure, or explanation. After reveal, verify the revealed correct option and Round scores against the expected fixture and accepted Answers.
- Drive Host advancement only after the public reveal or Leaderboard state allows it. Compare the ordered Leaderboard received by every connected viewer after every Round. At completion, verify one final result per joined Participant and that each total equals the sum of that Participant's revealed Round points.
- Bound connection, acknowledgement, phase transition, and overall run waits. A timeout, rejected required command, missing event, inconsistent payload, leaked answer, duplicate score, or failure to finish makes the run fail with a nonzero exit code. Close sockets on success and failure.
- Emit a machine-readable summary for both success and failure: target identifier without credentials, requested and connected/joined Participants, Questions completed, accepted Answers, intentional duplicate and late rejections, successful resumes, unexpected errors, scoring and convergence checks, configured or observed timing constants, and latency sample counts with p50/p95/max. Measure client-observed command acknowledgement round trips and Host-command-to-event delivery in the simulator process; label each metric rather than treating server timestamps as network latency. Do not impose an unapproved latency pass threshold.
- Keep local and deployed runs on the same scenario and report format. README instructions cover authorized setup, configuration names, command, and report interpretation. Only after a deployed 50-Participant full-match run passes should the README record its date, server and runner hardware, service configuration, Round timing constants, command, key measurements, and outcome. A failed or unrun deployed check must be described accurately.

## Testing Decisions

- The highest useful public seam is the simulator process against a running Game Server through the browser-facing Socket.IO protocol. Its exit status and structured report are the proof. Run the same scenario locally and against the deployed Game Server after #5, #6, and #7 provide the required events.
- Good tests assert observable Room behavior and public payloads: Lobby membership, Answer acknowledgements, reveal, Leaderboard convergence, resumed identity and score, final results, and process failure on invariant violations. They should not inspect private Game Server maps, timers, or scoring helpers.
- Add focused simulator tests only for setup validation, report/percentile calculations, and failure detection that cannot be reliably exercised by one costly full match. Reuse the existing simulator's connection and time-ping path and Game Server Room/Answer/reveal integration tests as prior art; do not duplicate all Game Engine scoring tests.
- Verify a small local run and the default 50-Participant local run, including intended duplicate and late rejection counts, mid-Round resume, secrecy, and identical ordered Leaderboards. Use a deliberately invalid setup or induced missing event to prove a nonzero exit, rather than accepting a report that silently omits failed checks.
- Verify the deployed run separately and retain its measured report and environment details in the README. There is no fixed performance threshold in this PRD; correctness and completion determine pass or fail, while latency percentiles are reported as evidence.

## Out of Scope

- Many concurrent Rooms, more than 50 Participants in one Room, active Room recovery after Game Server restart, multi-process failover, browser rendering or device load, a CI load job, Redis/Kafka, and performance tuning without measured evidence.

## Further Notes

- Depends on #5 Live Rounds, #6 Reconnection & Resume, and #7 Leaderboard & Final Results. #11 Dokploy Deployment supplies the deployed environment; its final proof documentation depends on this run.
- The current simulator checks 50 connections and time pings only. The starter Question Set has three Questions. The current Game Server can start and reveal a Round, but Host advancement, completed results, Leaderboard, and Resume Tokens are not yet available.
- Acceptance criteria:
  - [ ] With the default count, 50 distinct Participants connect, join one Lobby, complete every starter Question, and appear once in final results; a local run exits zero.
  - [ ] Correct and wrong Answers are reflected in revealed scores. Intentional new-key duplicate and post-deadline late Answers are rejected and counted; no Participant earns a second score in a Round.
  - [ ] The simulator fails if any pre-reveal event, acknowledgement, or snapshot discloses the correct option, correctness, or explanation.
  - [ ] A nonzero subset resumes during an open Round with the same identity, score, Answer state, option order, and deadline, then receives later events and finishes once.
  - [ ] All connected viewers receive identical ordered Leaderboards after each Round; final totals equal the sum of revealed Round points.
  - [ ] The report includes counts, unexpected errors, labelled p50/p95/max latency metrics with sample counts, and timing constants; missing invariants or timeouts exit nonzero.
  - [ ] The same scenario passes against the deployed Game Server; the README records date, hardware, configuration, command, metrics, and actual result without credentials or tokens.

