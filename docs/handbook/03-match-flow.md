# 3. How a Match Runs

## The server is the referee

The Game Server controls the Match. It decides when each Question starts and stops. It records the time when each answer arrives. It calculates all points.

The browser shows the Question and the countdown. The browser does not decide a result. The device clock of a player is used only to draw the countdown.

## The phases

A Room goes through these phases:

```text
LOBBY
  │  the Host clicks Start
  ▼
READY ─────────► QUESTION_OPEN ─────────► QUESTION_REVEAL
(3 seconds)      (30 seconds, or less)    (6 seconds)
  ▲                                            │
  └──────────── next Question ◄────────────────┤
                                               │ after the last Question
                                               ▼
                                           FINISHED
```

| Phase | What happens | How it ends |
|---|---|---|
| LOBBY | Players join. The roster updates live. Players read the scoring rules. | The Host clicks **Start match**. |
| READY | The screen tells players to get ready. This gives time to read the last reveal. | After 3 seconds. |
| QUESTION_OPEN | All players see the Question and the countdown. Each player can send one answer. | At the 30-second deadline, or when all connected players have answered. |
| QUESTION_REVEAL | Players see the correct answer, their points, and the Leaderboard with movement. | After 6 seconds. |
| FINISHED | The server saves the results. All players see the final results. | The Match is complete. |

After the Host clicks Start, the server moves through all phases automatically. Nobody can skip a Question or open two Questions at the same time.

## The same Question at the same time

When a Question opens, the server sets two times:

- `startsAt`: the time when the Question opens.
- `endsAt`: 30 seconds after `startsAt`.

The server sends these two times to every player. Each browser draws its countdown from these server times. All players therefore see the same deadline.

## When a Round closes

A Round closes in one of two ways:

1. **The deadline.** A server timer closes the Round at `endsAt`. This timer does not depend on any player.
2. **Everyone has answered.** When each connected player has an answer, the server closes the Round early. This keeps the game fast.

The Round closes only one time. If the timer and the last answer arrive together, the server still closes and reveals one time.

> **Note:** A player who disconnects still counts as connected for 5 seconds. A refresh therefore does not close the Round early for everyone. See [Reconnection](06-reconnection.md).

## The end of the Match

After the last reveal, the server saves one result for each player. It writes all results and the FINISHED status in one database transaction. The Room becomes FINISHED only after this write succeeds. If the database write fails, the server tries again every 2 seconds.

Then all browsers show the final results. See [Scoring](04-scoring.md) for what the results contain.
