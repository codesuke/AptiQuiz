# 4. Scoring

## The rule

| Answer | Points |
|---|---|
| Correct | 500 to 1000. A faster answer gets more points. |
| Wrong | 0 |
| No answer | 0 |

Players see this rule in the Lobby before the Match starts. The Lobby shows the values that the server uses, so the rule on the screen is always correct.

## The formula

For a correct answer:

```text
points = 500 + floor(500 × (1 − time ÷ 30 000 ms))
```

`time` is the Effective Response Time. It is the time from the start of the Question to the arrival of the answer, with a small correction for network delay. [Network delay](05-network-delay.md) explains this correction.

Examples:

| Correct answer after | Points |
|---|---|
| 0 seconds | 1000 |
| 6 seconds | 900 |
| 15 seconds | 750 |
| 30 seconds | 500 |

Each correct answer gets more points than any wrong answer. Between two correct answers, the faster answer gets more points.

## Why a wrong answer gets 0 and not less

We chose not to remove points for a wrong answer. These are the reasons:

- Practice must teach students to try. A penalty makes nervous students skip Questions.
- Speed already separates the strong players. A penalty is not necessary for a good ranking.
- The rule is simple. Each player understands it in a few seconds.

## One answer for each Question

The server accepts only the first answer from a player for a Question. A player cannot change the answer. A second answer gets the error `already_answered`. The server never adds points two times.

## The Leaderboard

After each Question, the server makes the Leaderboard. It sorts players by these rules, in this order:

1. More total points comes first.
2. If the points are equal, less total time on correct answers comes first.
3. If the time is also equal, the player who joined first comes first.

Each player therefore has a different rank.

### Movement

Next to each name, the Leaderboard shows the change since the last Question:

- **▲ 2** means the player went up 2 places.
- **▼ 1** means the player went down 1 place.
- No mark means no change. The first Question has no movement.

All players and the Host see the same Leaderboard. The 50-player test checks this.

## The final results

At the end of the Match, each player sees:

| Item | How the server calculates it |
|---|---|
| Rank and total points | From the last Leaderboard. |
| Accuracy | Correct answers ÷ number of Questions in the Match. |
| Average speed | The average Effective Response Time for the Questions that the player answered. |
| Topic strengths | For each topic: correct answers out of Questions in that topic. |

The screen also shows a podium for the top players and the results of all players.

## Where the rules live

The scoring rules are in the Game Engine package (`Apti-App/packages/game-engine`). The values are in `Apti-App/apps/game-server/src/config.ts`:

| Value | Setting |
|---|---|
| Round duration | 30 000 ms |
| Largest delay correction | 100 ms |
| Score step (bucket) | 100 ms |
