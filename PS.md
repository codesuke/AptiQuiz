# AptiQuiz — Official Problem Statement and Build Specification

> Source: `Azisly ai.pdf`, pages 5–6.
>
> The **Official problem statement** section below preserves the wording of the supplied brief. Only Markdown formatting and line wrapping have been applied. Everything after that section is team-authored implementation guidance and is not part of the official brief.

## Official problem statement — verbatim

### Problem Statement 3: AptiQuiz

#### Aptitude practice as a live multiplayer game.

#### The background

Aptitude and logical reasoning tests are the first filter in most campus placements. They reject thousands of capable students every year, mostly because of speed and pressure, not ability. Practising alone from a PDF is slow and dull, and nobody practises under real time pressure with other people around.

#### The challenge

Build a real-time multiplayer web app where up to 50 students join a room and race through aptitude and logic questions at the same time. Everyone sees the same question together, answers against the clock, and watches a live leaderboard move. The app should feel fast, fair and fun enough that students want to play it again, with enough depth that colleges would run leagues on it.

#### What your app must do (the core)

1. Question authoring. A host can create question sets: question text, options, the correct answer, a topic (for example quantitative, logical, verbal, data interpretation) and a difficulty. Questions may include an image or a table. The host can edit, reorder and reuse sets.
2. Rooms. A host creates a room from a question set and gets a short join code. Players join with a name from any device and wait in a lobby that shows who is in. The host starts the game.
3. Live play. Everyone sees each question at the same time, with a countdown. Players answer on their phones or laptops. When time is up (or everyone has answered), the correct answer is revealed and the round’s scores appear.
4. Scoring that rewards speed and accuracy. A correct answer scores more the faster it arrives; a wrong one scores nothing or loses points (your choice, but explain it). The rules must be visible to players.
5. Live leaderboard. After each question, show standings and movement (who climbed, who dropped). At the end, show a results screen with each player’s accuracy, average speed and topic-wise strengths.
6. A college league. Rooms belong to a college. Scores across rooms feed a league table showing top players and top colleges over a period.

#### The technical requirements

- The server is the referee. The server decides when a question starts and ends, and calculates the scores. A player’s device clock must never decide the result.
- Fair under network delay. Two players on different connections answering at the same moment must be treated fairly. Explain in your README how you handled it.
- Reconnection. If a player refreshes or loses connection mid-game, they must rejoin with the same score and see the current question, without disturbing others.
- Cheating resistance. At minimum: shuffle the order of options per player, don’t send the correct answer to the browser before the round ends, and ignore late or duplicate answers. Think about what else a determined student might try.
- Works with 50 players. Show how you tested this (for example, a script that simulates 50 players).

#### Also expected

- Keep the 50-player test script in your repository and say in the README how to run it and what it showed.
- Describe in the README how you handled network delay, in plain words.

#### Make it yours

- Team battles, where teams of 3 to 5 compete with combined scores.
- A daily challenge with a streak, and topic leagues or seasons.
- A host mode for faculty: see which questions most students got wrong, and export results.
- Power-ups such as double points or “remove two wrong options”, with limits so they stay fair.
- A spectator mode for a projector at a college event.
- Adaptive difficulty that responds to how the room is doing.
- Accessible, low-data design: colour-blind-safe, large text, sound on or off.
- Anything else you think would make a better aptitude game.

---

## Team build specification

> Status: **PARTIALLY IMPLEMENTED.** Accounts and the Dokploy deployment exist; the complete multiplayer match and 50-Participant proof remain unverified. [MVP issue #13](https://github.com/codesuke/AptiQuiz/issues/13) is the current tracked scope for the team-authored build plan below. The official problem statement above is unchanged.

### Product goal

Deliver a reliable three-minute demonstration in which a host selects a reusable question set, creates a room, two or more players join with a code, everyone receives synchronized questions, the server scores their answers, a live leaderboard moves, and reconnecting restores a player’s current game and score.

The implementation must preserve a direct path from a single-process hackathon build to a horizontally scalable deployment without rewriting the game rules.

### MVP release boundary

#### Must ship

- Minimal question-set authoring with create, edit, reorder, and reuse.
- Questions with text, options, correct answer, topic, and difficulty.
- Optional image URL and table content on Questions.
- A short room code and a lobby showing connected players.
- Host-controlled start and server-controlled round transitions.
- Synchronized questions and countdowns based on server timestamps.
- One accepted answer per player per round.
- Speed-and-accuracy scoring calculated only by the server.
- Correct-answer reveal only after the round closes.
- Per-player option shuffling.
- Live rank and rank-movement display.
- Final accuracy, average response time, and topic strengths.
- Reconnection using an opaque resume token.
- A basic college association and aggregated player/college league view.
- A repeatable 50-player simulation script.
- Mobile layout, keyboard operation, readable contrast, and clear failure states.

#### Explicitly defer until the core is reliable

- Teams, power-ups, streaks, seasons, and adaptive difficulty.
- Faculty exports and advanced analytics.
- Spectator-specific presentation controls.
- Further account enhancements, social features, payments, and notifications. Core accounts are already implemented.
- College registration and approval, Admin Console, Featured set management, Guest score claiming, and multiple League Period views.
- Complex media upload; support image URLs or seeded assets first.

### Acceptance journey

1. A host opens the authoring screen, creates or selects a set, and creates a room.
2. The room receives a short join code.
3. Participants join from separate browser sessions, enter a display name, and appear in the lobby. The Room belongs to the Host's Home College.
4. The host starts the match.
5. Every player sees the same question and server-derived remaining time.
6. Each Participant sees their server-assigned shuffled option order without receiving the correct-answer field.
7. The server accepts at most one on-time answer from each player.
8. When everyone answers or the deadline expires, the server closes the round, calculates scores, reveals the answer, and broadcasts standings.
9. The leaderboard shows current rank and movement from the previous round.
10. A refreshed player resumes with the same identity, score, room, and current question.
11. The final screen shows accuracy, average response time, and topic strengths. Eligible signed-in Users' results contribute to the College League.
12. The load script completes a room with 50 simulated players and reports connections, answers, errors, and event latency.

## Planned architecture

```text
Host and player browsers
        │ HTTPS + WebSocket
        ▼
Real-time gateway
        │ validates commands and identity
        ▼
Authoritative game engine
        ├── GameStore interface ──► in-memory store for the first demo
        │                         └► Redis for multiple server instances
        ├── durable repository ──► PostgreSQL for sets, results and leagues
        └── event stream ────────► metrics/analytics worker later
```

### Boundary decisions

- Use a React TypeScript client and a Node.js TypeScript real-time server.
- Use WebSockets through Socket.IO for room events and automatic connection recovery behavior.
- Keep all game transitions in a pure `GameEngine`; socket handlers translate messages but never contain scoring rules.
- Put transient room state behind a `GameStore` interface. Start with an in-memory implementation, then add Redis without changing the engine.
- Put authoring, completed matches, and league aggregates behind a repository interface intended for PostgreSQL.
- Share event payload types and validation schemas between the browser, server, and simulator.
- Treat the server’s monotonic elapsed time and stored UTC timestamps as authoritative. Browser clocks are display-only.

### Components

| Component | Responsibility | First build | Scale-up replacement |
|---|---|---|---|
| Web client | Host controls, player UI, countdown display, reconnect token | React SPA | CDN-served React SPA |
| Real-time gateway | Authentication of room commands and WebSocket events | One Node.js process | Multiple instances behind a WebSocket-aware load balancer |
| Game engine | State transitions, timing, answer acceptance, scoring | Pure TypeScript module | Same module on every server instance |
| Game store | Lobby, current round, participants, accepted answers | Process memory | Redis with atomic operations and expiry |
| Durable store | Question sets, completed results, league data | SQLite or PostgreSQL if time permits | PostgreSQL |
| Fan-out | Broadcast room events | Socket.IO room | Socket.IO Redis adapter |
| Load simulator | Join and play as virtual players | Local script | CI smoke/load job |

## Authoritative game model

### Room state machine

```text
LOBBY → QUESTION_OPEN → QUESTION_REVEAL → LEADERBOARD
  ▲                                              │
  └──────────────── next question ───────────────┘

LEADERBOARD → FINISHED when no questions remain
```

Only the server may move the room between states. Every command is checked against the current state and the sender’s role.

### Required invariants

- A room has exactly one active round at most.
- A round has one immutable `startsAt` and `endsAt` chosen by the server.
- A participant can have no more than one accepted answer per round.
- An answer is scored against the question version attached to that round.
- The correct option is absent from all pre-reveal client payloads.
- Scores only increase through the game engine’s scoring function.
- A reconnect changes the socket connection, not the participant identity.
- Host commands require the room’s host token.
- Every mutating command carries an idempotency key.

## Fair timing and scoring

### Timing

1. The server creates the round with `startsAt`, `endsAt`, and `durationMs`.
2. The server broadcasts those timestamps; clients render a countdown from periodically estimated server time.
3. The server records answer receipt time. It never trusts a browser-provided answer timestamp.
4. The server maintains a rolling median round-trip time from server-initiated ping/pong samples.
5. For ranking, the server may subtract a capped one-way latency estimate (`medianRtt / 2`) from receipt time. The cap and method must be identical for every player and documented.
6. Very close effective times are placed in the same small scoring bucket so insignificant network differences do not change points.
7. Answers received outside the server’s allowed deadline policy are rejected, even if the client still shows time remaining.

All constants—the compensation cap, scoring bucket, duration, and any grace window—must live in server configuration and be printed by the load-test report.

### Initial scoring rule

For a correct answer:

```text
elapsedRatio = clamp(effectiveElapsedMs / durationMs, 0, 1)
speedBonus   = floor(500 × (1 - elapsedRatio))
score        = 500 + speedBonus
```

An incorrect answer scores `0`. The maximum is `1000`, the minimum correct-answer score is `500`, and the rule must be visible before the match starts. This formula is provisional until implemented and tested.

## Reconnection and identity

- On joining, the server returns an opaque, high-entropy resume token bound to `roomId` and `participantId`.
- The browser stores the token locally and presents it after reconnecting.
- The server rotates or revalidates the token and attaches the new socket to the existing participant.
- The synchronization response contains the public room state, current round, whether the participant already answered, remaining server time, and current standings.
- Display names are not identities and cannot be used to reclaim a score.
- A reconnect must not broadcast a second participant or reset the room timer.

## Cheating-resistance baseline

- Generate and store a stable per-player option permutation for every round.
- Send opaque option IDs and labels, never the correct option or explanation before reveal.
- Accept only the first valid answer for a participant and round.
- Reject answers for a different room, question, round, or state.
- Reject late commands according to server time.
- Require host credentials for start, advance, and close commands.
- Rate-limit joins and commands by connection, token, and IP where practical.
- Validate every HTTP and socket payload at runtime.
- Keep scoring and league writes entirely server-side.
- Log suspicious duplicate, late, malformed, and unauthorized commands without exposing secrets.

This baseline reduces casual cheating; it is not a claim of complete cheat prevention.

## Planned data model

| Entity | Minimum fields |
|---|---|
| College | `id`, `name`, `normalizedName` |
| QuestionSet | `id`, `hostId`, `title`, `createdAt`, `updatedAt` |
| Question | `id`, `setId`, `position`, `text`, `options`, `correctOptionId`, `topic`, `difficulty`, `media` |
| Room | `id`, `joinCode`, `hostTokenHash`, `collegeId`, `questionSetId`, `status`, `createdAt` |
| Participant | `id`, `roomId`, `displayName`, `collegeId`, `resumeTokenHash`, `score` |
| Round | `id`, `roomId`, `questionId`, `position`, `startsAt`, `endsAt`, `status` |
| Answer | `roundId`, `participantId`, `selectedOptionId`, `receivedAt`, `effectiveElapsedMs`, `correct`, `points` |
| MatchResult | `roomId`, `participantId`, `accuracy`, `averageResponseMs`, `topicStats`, `totalScore` |

Use database uniqueness constraints for `(roundId, participantId)` answers and room join codes. Do not rely only on application-level checks.

## Event contract

Every command receives either an acknowledgement containing the authoritative result or a typed error. Schemas are shared and runtime-validated.

### Client to server

| Event | Purpose |
|---|---|
| `room:create` | Create a room from a question set and college |
| `room:join` | Join with code, display name, and college |
| `room:resume` | Reclaim a participant using a resume token |
| `game:start` | Host starts the first round |
| `answer:submit` | Submit one option with an idempotency key |
| `round:advance` | Host advances after reveal/leaderboard |
| `time:ping` | Measure server/client timing offset for display |

### Server to client

| Event | Purpose |
|---|---|
| `room:snapshot` | Complete public state used on join or reconnect |
| `lobby:updated` | Current participant list |
| `round:opened` | Public question, shuffled options, and server timestamps |
| `answer:accepted` | Server acknowledgement without correctness before reveal |
| `round:revealed` | Correct option, explanation, and round scores |
| `leaderboard:updated` | Ranks, scores, and movement |
| `game:finished` | Per-player results and league impact |
| `game:error` | Recoverable typed failure with a safe message |

## Fifty-player proof

The simulator must:

1. Create or use one test room.
2. Connect 50 independent virtual players.
3. Join every player and verify the lobby reaches 50.
4. Start a multi-question game.
5. Submit correct, incorrect, duplicate, and deliberately late answers.
6. Disconnect and resume a subset of players during a round.
7. Verify no participant receives two scores for one round.
8. Verify the correct answer is absent before reveal.
9. Verify all connected players converge on the same leaderboard.
10. Print connection success, event-latency percentiles, rejected duplicates, rejected late answers, reconnect success, and errors.

Do not claim that the app supports 50 players until this script passes against the deployed or locally demonstrated server. Record the hardware, server configuration, date, and result in the README.

## Four-agent execution plan

Before parallel work, freeze the shared event schemas, room state machine, file ownership, and minimum acceptance journey. One integration owner controls shared configuration and resolves merges.

| Instance | Exclusive ownership | Four-hour output |
|---|---|---|
| 1 — Server/game | Game engine, room store, gateway, timing, scoring, reconnect | A complete authoritative match lifecycle |
| 2 — Host | Question-set authoring, lobby, host controls | Host can author/select, create, start, and advance |
| 3 — Player | Join flow, synchronized question UI, reveal, leaderboard, results | Mobile-first player journey with reconnect |
| 4 — Verification/scale | Simulator, adversarial tests, league aggregation, README/deployment | 50-player evidence and integration safety net |

### Timeline

| Time | Target |
|---|---|
| 0:00–0:20 | Scaffold once; freeze schemas and state machine; prove one WebSocket round trip |
| 0:20–1:20 | Build isolated server, host, player, and simulator slices against shared fixtures |
| 1:20–2:10 | Integrate room creation, joining, question delivery, answers, reveal, and leaderboard |
| 2:10–2:50 | Add reconnection, option shuffling, duplicate/late rejection, and final analytics |
| 2:50–3:20 | Run and repair the 50-player simulation; add basic college league aggregation |
| 3:20–3:45 | Mobile/accessibility pass, error states, deployment, and README evidence |
| 3:45–4:00 | Freeze features, rehearse the demo, and record a backup |

## Scale-up sequence

Do not introduce distributed infrastructure before the single-process implementation passes its invariants and simulation.

1. **Measure one instance.** Run the simulator and record event-loop delay, memory, CPU, connection count, and event latency.
2. **Externalize transient state.** Implement the existing `GameStore` interface with Redis, including atomic first-answer acceptance and room expiry.
3. **Externalize fan-out.** Add the Socket.IO Redis adapter so all gateway instances can publish to the same room.
4. **Persist durable data.** Store question sets, completed match results, and league aggregates in PostgreSQL with indexes and uniqueness constraints.
5. **Add multiple instances.** Deploy behind a WebSocket-aware load balancer; configure affinity where the selected transport requires it.
6. **Make writes idempotent.** Use command IDs and database constraints so retries cannot duplicate answers, match completion, or league points.
7. **Separate analytics.** Publish completed-game events to a worker rather than delaying live rounds with reports or league recomputation.
8. **Observe production.** Track active rooms, connected sockets, broadcast latency, reconnect rate, rejected answers, game-loop errors, and store latency.
9. **Load test in stages.** Test 50 players in one room first, then many concurrent rooms, then failure/restart scenarios.

## Demo script

1. Show a reusable question set and create a room.
2. Join from a phone and another browser with the short code.
3. Start a question and point out the synchronized server timer.
4. Submit at different speeds and show the reveal plus rank movement.
5. Refresh one player and demonstrate restored score and current question.
6. Open final analytics and the college league.
7. Show the completed 50-player simulation output and briefly explain latency compensation.

## Definition of done

- The complete acceptance journey works without manual database or console edits.
- Host and player controls enforce their roles on the server.
- Client payload inspection confirms no correct answer is sent before reveal.
- Duplicate and late answers are rejected and tested.
- Refreshing a player preserves identity, score, and current room state.
- Every client converges on the same final standings.
- The 50-player simulator passes and leaves a reproducible report.
- The UI works on a phone-sized viewport and remains keyboard usable.
- Secrets are read from environment variables and `.env` is not committed.
- The README explains setup, scoring, network-delay handling, test commands, architecture, and known limitations.

## Claims ledger

| Claim | Verdict | Source | Fix | Flags to |
|---|---|---|---|---|
| The official section preserves the AptiQuiz wording | VERIFIED | `Azisly ai.pdf`, pages 5–6 | None | — |
| The brief requires up to 50 players | VERIFIED | `Azisly ai.pdf`, page 5 | None | — |
| The brief requires server-authoritative timing and scoring | VERIFIED | `Azisly ai.pdf`, page 5 | None | — |
| The brief requires reconnection, option shuffling, delayed answer disclosure, and late/duplicate rejection | VERIFIED | `Azisly ai.pdf`, page 5 | None | — |
| The brief requires a retained 50-player test script and README explanation of network-delay handling | VERIFIED | `Azisly ai.pdf`, pages 5–6 | None | — |
| The architecture, event contract, timing method, scoring formula, and schedule are implemented | PLANNED — NOT YET VERIFIED | No application code exists in the repository | Verify each item against code and tests as it lands | — |
| The finished application supports 50 players | NOT CLAIMED | Must be established by the simulator | Publish evidence only after a passing run | — |
