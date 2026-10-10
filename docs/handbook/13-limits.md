# 13. Limits and Next Steps

## Known limits

| Limit | Effect | Plan |
|---|---|---|
| Live Rooms are in memory | If the Game Server restarts, the live Matches stop. Completed results stay in the database. | Move live Room data to Redis. Do not restart the server during a demonstration. |
| One Game Server | The test proves one Room of 50 players. Many Rooms at the same time are not tested. | Test many Rooms. Add more servers with Redis when the test shows a need. |
| One League period | The League shows the current week only. | Add past weeks and seasons. |
| Cheating on a second device | A student can look up an answer on another device. | Use a supervised room for important events. |

## Ideas from the brief that are not built

The brief lists optional ideas under "Make it yours". These are not built yet:

- Team battles with combined scores.
- A daily challenge with a streak.
- Faculty reports: the Questions that most students got wrong, and a results export.
- Power-ups, such as double points.
- A separate spectator screen for a projector. The Host screen already shows the Question and the Leaderboard, so it works on a projector today.
- Adaptive difficulty.
- Large-text and colour-blind modes. Results already use text labels, not colour only.

The [GitHub Issues](https://github.com/codesuke/AptiQuiz/issues) list the planned work.
