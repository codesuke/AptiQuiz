# Slice #40: Show the Leaderboard after each Round

- Parent PRD: [#7](https://github.com/codesuke/AptiQuiz/issues/7) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/40
- Slice type: Vertical
- Closed: 2026-10-10
- Commit: 7be6167 (server) and 9d101b9 (web)

## Acceptance-criteria result

All criteria met. Leaderboard is embedded in the revealed `round:state` view (no separate wire phase); the engine's unused `LEADERBOARD` phase stays as is.

## Implementation summary

`rankStandings` (pure, in `@aptiquiz/game-engine`) orders by total score, then summed Effective Response Time of correct Answers, then Lobby join time, then Participant ID, with ranks 1..n and movement = previous rank − rank (null after Round 1). The Game Server builds cumulative standings from accepted Answers of closed Rounds and adds `leaderboard` to the revealed view for the Host and every Participant; rejoin and host acknowledgements return the same view. The web shows a rank / name / movement (▲ ▼ = —) / total table and highlights the viewer's row.

## Verification evidence

`standings.test.ts` (7) and `leaderboard.test.ts` (6) cover different winners and movement, first-Round neutral movement, identical Host and Participant order, tie-breaks, disconnected and unanswered Participants, and rejoin. The web `leaderboard-view.test.ts` covers labels and own-row detection. The `ParticipantId` and join-time tie-breaks are unit-tested only, because the in-memory store assigns ids in join order.

## Authorship

Codesuke <codesuke@gmail.com> (7be6167 (server) and 9d101b9 (web)). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/7

## Slice type

Vertical

## What to build

After each revealed Round, the Host and Participants see the same Game Server-calculated Leaderboard before the Host advances. It shows cumulative scores, ranks, and movement, and a returning viewer receives the current standings.

## Acceptance criteria

- [x] After every revealed Round, the Host and all connected Participants see identical ordered standings with each joined Participant's cumulative score and rank; incorrect and unanswered Questions add zero and disconnected Participants remain listed.
- [x] Two Rounds with different winners produce correct rank movement. The first Round shows neutral movement; subsequent movement compares against the previous completed Round.
- [x] Equal scores are ordered by lower total Effective Response Time for accepted correct Answers, then earlier Lobby join time, then Participant ID when those values are equal. Every client sees the same order.
- [x] Only the Host can advance after the Leaderboard appears. A returning Host or Participant receives the current Leaderboard without requiring the earlier broadcast.

## Test seam

Drive a multi-Round Room through public Game Server Socket.IO events with controlled time and multiple Host and Participant connections; assert their received standings and the current view returned on rejoin.
