# 9. The 50-Player Test

## Why we test

The brief asks that the application works with 50 players. We do not want to say this without proof. A script therefore plays a full Match with 50 virtual players.

The script is in the repository: `Apti-App/apps/simulator`.

## What the script does

1. It creates a new Room through the web application, as a signed-in Host.
2. It connects 50 separate virtual players to the Game Server.
3. It joins each player to the Lobby. It checks that the Lobby shows 50 different players.
4. It starts the Match and plays every Question.
5. It sends answers of these types:
   - correct answers,
   - wrong answers,
   - a second answer (duplicate) from some players,
   - the same request sent again (replay),
   - answers after the deadline (late).
6. It leaves some players silent in the first Question.
7. During the second Question, it disconnects some players. Then it brings them back with their Resume Token.
8. It checks every message before each reveal. No message must contain the answer.
9. After each reveal, it checks that all players and the Host see the same Leaderboard.
10. At the end, it checks the saved results in the database.

If a check fails, the script stops with an error code. The report names the check that failed.

## How to run it

You need a Host account with a Home College.

1. Go to the `Apti-App/` folder.
2. Start the application: `pnpm dev`.
3. Sign in as the Host in the browser.
4. Copy the `Cookie` header of your session from the browser developer tools.
5. In a second terminal, run:

   ```bash
   cd Apti-App
   SIMULATOR_HOST_COOKIE='<your Cookie header>' pnpm simulate
   ```

6. Read the JSON report.

> **Caution:** The session cookie is a secret. Do not save it in a file or share it. The script never prints it.

To test the live servers, add these two values:

```bash
SIMULATOR_WEB_URL=https://aptiquiz.codesuke.in \
SIMULATOR_URL=https://game.aptiquiz.codesuke.in \
SIMULATOR_HOST_COOKIE='<your Cookie header>' \
pnpm simulate
```

## What it showed

We ran the test against the live servers on 10 October 2026. The script finished without errors in about 33 seconds.

| Check | Result |
|---|---|
| Players connected and joined | 50 of 50 |
| Different players in the Lobby | 50 |
| Questions played | 3 of 3 |
| Answers accepted | 140 (30 of them wrong) |
| Duplicate answers rejected | 30 of 30 |
| Replays that returned the first result | 30 of 30 |
| Late answers rejected | 10 of 10 |
| Players who reconnected correctly | 15 of 15 |
| Leaderboard the same for all viewers | 3 of 3 Questions |
| Saved results that match the points | 50 of 50 |
| Messages that showed the answer early | 0 of 2 269 |

Time from command to reply, measured by the script over the internet:

| Action | Typical (p50) | Slow (p95) |
|---|---|---|
| Ping | 36 ms | 57 ms |
| Join | 102 ms | 200 ms |
| Answer | 30 ms | 51 ms |
| Reconnect | 25 ms | 36 ms |

## What the result does not show

The test proves one Room of 50 players. It does not prove many Rooms at the same time. It also does not test other networks or real browsers. The full report is in the [project README](../../README.md#50-participant-proof).
