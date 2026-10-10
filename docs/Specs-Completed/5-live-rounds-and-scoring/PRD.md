# PRD #5: Live Rounds & Server-Authoritative Scoring

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/5
- Archived: 2026-10-10
- Status: all slices implemented, verified, and closed. The PRD issue was closed with the archive.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#33](https://github.com/codesuke/AptiQuiz/issues/33) | Open a timed Round | Vertical | [slice](slices/33-open-a-timed-round.md) |
| [#34](https://github.com/codesuke/AptiQuiz/issues/34) | Accept and score Answers | Vertical | [slice](slices/34-accept-and-score-answers.md) |
| [#35](https://github.com/codesuke/AptiQuiz/issues/35) | Close and reveal a Round | Vertical | [slice](slices/35-close-and-reveal-a-round.md) |
| [#36](https://github.com/codesuke/AptiQuiz/issues/36) | Advance through the Question Set | Vertical | [slice](slices/36-advance-through-the-question-set.md) |

## Build summary

- **Round open (#33).** Start opens Question 0 with an immutable server deadline (30 s, Game Server config). `round:state` goes to a channel for each Participant, carrying their own stable option order and opaque option ids (seeded by a random Room salt, the Question index, and the Participant id). The Host gets the authored order. Join and host acknowledgements carry the current Round view, so a reconnecting browser recovers it. No pre-reveal payload is built from the stored Question, so `correctOptionId` cannot leak.
- **Answers and scoring (#34).** `round:answer` accepts a joined Participant's first valid Answer received at or before `endsAt` by server receipt time, with no grace. Replays return the first result, and every other case gets a typed refusal. Server-initiated `latency:ping` samples feed a rolling median. The pure Game Engine computes the Effective Response Time (`min(median/2, 100 ms)` compensation, clamp, 100 ms bucket) and `500 + floor(500 × (1 − ERT/duration))` points for a correct Answer.
- **Close and reveal (#35).** The Round closes once, through the Game Engine, at the deadline (injectable scheduler) or when every connected Participant has answered. The reveal gives each receiver the correct option in their own ids, their result, and every Participant's Round points.
- **Advance and finish (#36).** The Host alone advances after a reveal. Each next Round reuses the same open path with a fresh deadline. After the last Question the Room is `FINISHED` in memory and in PostgreSQL.
- **New contracts:** `publicQuestionSchema`, `roundViewSchema` (open and revealed), `roundRulesSchema` (in the Lobby snapshot), `round:answer`, `latency:ping`, `room:advance`, and the errors `round_not_revealed`, `room_finished`, and `advance_failed`. **New engine exports:** `orderOptions`, `isAnswerOnTime`, `medianRoundTrip`, `effectiveResponseTime`, and `scoreAnswer`. The engine `ADVANCE` is allowed from `QUESTION_REVEAL`.
- **Web (kept minimal on request):** a countdown from server timestamps; answer buttons with one idempotency key per Question; "Answer locked"; the reveal with the correct answer, your answer, your result, and a Round scores table; Host "Next question" / "Finish match"; and "Match finished."

## Verification summary

- **Automated (final):** Game Engine 26, Game Server 130 (repeated 3 times per slice), database 42 against the configured PostgreSQL, and web 156. Typecheck, Biome on the slice paths, and production build pass.
- **End-to-end (2026-10-10):** a signed-in Host and two Guest Participants in headless Chrome played a three-Question Match against the real web app and Game Server. 12/12 checks passed: the scoring rule is visible in the Lobby; both countdowns read 30 s from the same deadline; a locked Answer shows no correctness; early closure; +1000 for a fast correct Answer and 0 for a wrong one; Host advance opens a fresh deadline; deadline closure gives "No answer: 0 points"; finished everywhere with no fourth Question; and no correct option outside a reveal in 334 captured WebSocket frames.
- **`code-review` (Standards and Spec) per slice.** Fixed:
  - option ids that revealed the authored order;
  - Answer receipts reused across Questions;
  - a reconnecting browser locked out by `not_participant`;
  - a socket dropped mid-join counted as connected, which blocked early closure;
  - a socket that switched Participant kept the stale Participant channel;
  - a silent `closeRound` skip;
  - stale views replacing newer ones;
  - `room_finished` misreported as `round_not_revealed`;
  - a missing `FINISHED` persistence.
- **Flaky, unrelated:** two database-backed tests (Question Set concurrent reorder, Google sign-in integration) each failed once under full-suite load and passed on rerun.

## Known limitations

- Live Rounds, Answers, and scores are in memory. A Game Server restart loses an active Match, and Answers are not persisted (#7 owns Match results).
- A client can delay its `latency:ping` acknowledgements to inflate its median round trip. The 100 ms cap bounds the gain.
- After `FINISHED`, rejoin and host acknowledgements return `round: null`. #7 supplies final standings.
- Full 50-Participant Match load is not proven (#10).
- `Apti-App/apps/web/.env` holds production URLs and secrets that differ from `Apti-App/.env`. A local run must start the web app with the root values, or the Room registration is refused as `tampered`.

## Authorship

Derived from commit authors on `main`. The implementation was produced with AI agents under the user's direction.

- Codesuke <codesuke@gmail.com>: `ffca687` (#33), `146d03e` (#34), `defe31e` (#35), `3c7dd72` (#36).

## Follow-ups

- #7: Leaderboard rank movement, final metrics, persisted Match results, and the explanation in the reveal.
- #6: Resume Tokens; reconnect during a Round currently relies on rejoining with the same join key.
- #10: the 50-Participant Match load proof.

## Issue snapshot

## Problem statement

Participants need to answer the same timed Questions under server-controlled rules. Browser clocks and network delay must not decide whether an Answer counts or how many points it earns.

## Outcome

The Game Server opens each Round, accepts one valid on-time Answer per Participant, closes and reveals the Round, awards speed-and-accuracy points, and lets the Host advance until the match finishes.

## User stories

1. As a Participant, I want a shared Question and countdown so I can compete under the same deadline.
2. As a Participant, I want my first valid Answer counted once and the scoring rule explained before play.
3. As a Host, I want to advance after a reveal so the Room can finish its Question Set.

## Requirements

- The Game Server opens a Round with immutable `startsAt` and `endsAt` timestamps and a configured 30-second duration. The browser displays remaining time from server timestamps; browser time never decides Answer acceptance or scoring.
- Every Participant gets the same Question with a stable, server-assigned option order for that Participant and Round. Pre-reveal payloads, including snapshots and error responses, omit the correct option and explanation.
- Only a joined Participant may submit an Answer for the current Room, Round, Question, and option. Validate each command at run time. Accept the first valid Answer received by the Game Server at or before `endsAt`; reject malformed, unauthorized, wrong-Room/Round/Question, duplicate, and later Answers. There is no deadline grace period. Each mutation has an idempotency key and typed acknowledgement.
- The Game Server measures round-trip delay with server-initiated ping/pong samples and uses a rolling median. For scoring only, subtract `min(medianRtt / 2, 100 ms)` from the server-observed elapsed time. Subtract zero when no valid sample exists. Clamp the result to the Round duration, then floor it to a 100 ms Effective Response Time bucket. Delay compensation never makes a late Answer valid.
- A correct Answer earns `500 + floor(500 × (1 − Effective Response Time / durationMs))` points, between 500 and 1000. A wrong or unanswered Question earns zero. Show this rule and the delay policy before the match; explain the configured values in the README.
- Close once at the deadline or when all connected Participants have answered. After closure, reveal the correct option and Round scores. The Host alone can advance after reveal; the Game Server finishes after the last Question. #7 adds rank movement and final metrics.

## Acceptance criteria

- [x] Two Participants receive the same Question and server deadline, each with stable option order; their browser countdowns follow the same server timestamps. No pre-reveal message contains the correct option or explanation.
- [x] A joined Participant's first valid Answer received at or before `endsAt` is acknowledged once. An Answer received after `endsAt`, including one within 200 ms after it, is rejected even if compensation would make its scored time earlier.
- [x] Malformed, wrong-Room/Round/Question/option, unauthorized, duplicate, and retried Answer commands cannot change a score or create a second accepted Answer.
- [x] Faster correct Answers earn more points under the 30-second, 100 ms cap, and 100 ms bucket policy; wrong and unanswered Questions earn zero. With no valid delay sample, compensation is zero. The rule is visible before play.
- [x] The Round closes once when all connected Participants answer or its deadline arrives; only then do Participants see the correct option and Round scores. Later Answers cannot change them.
- [x] Only the Host can advance after reveal. Each next Round gets a new server deadline, and the Room finishes after the final Question without opening another Round.

## Implementation decisions

- Decision: Keep the 30-second duration, 100 ms one-way compensation cap, 100 ms scoring bucket, and zero deadline grace in Game Server configuration.
  - Rationale: These values were approved for the MVP and must be applied equally to every Participant.
- Decision: Use server receipt time for deadline checks before applying compensation or bucketing for points.
  - Rationale: A compensated score must not turn a late Answer into an accepted Answer.
- Decision: Keep phase and scoring rules in the pure Game Engine; Socket.IO handlers validate commands, authorize Participants and the Host, and publish domain events.
  - Rationale: ADR 0006 keeps the Game Server authoritative and the rules testable outside transport code.

## Testing decisions

- Highest useful public test seam: Game Server Socket.IO Round and Answer events, with the exported Game Engine interface for scoring boundaries.
- Relevant prior tests: Game Engine phase and provisional score tests, Game Server handshake tests, and Room/Lobby behavior from #4.
- Behavior that must be verified: shared deadline and stable shuffle; hidden answer; on-time and late boundaries; command authorization and idempotency; sample/no-sample compensation and 100 ms buckets; wrong and unanswered scores; early/deadline closure; reveal timing; Host-only advance; final completion.

## Dependencies

- #4 Rooms & Lobby supplies Room creation, Participant joins, and Host start.

## Out of scope

- Deliberately excluded: power-ups, adaptive difficulty, sound, automatic advancement, and Participant-controlled transitions.
- Deferred to #7: Leaderboard rank movement, final Participant metrics, and persisted Match Results. Full 50-Participant match load proof belongs to #10.
