# AptiQuiz Handbook

This handbook explains AptiQuiz in simple words. Read it in order, or go directly to the page that you need.

The handbook uses the rules of ASD-STE100 Simplified Technical English. Sentences are short. Each paragraph has one topic. Procedures use numbered steps. Words with a capital letter, such as Room or Round, are AptiQuiz terms. The [glossary](../../CONTEXT.md) gives their full definitions.

## Pages

| Page | It tells you |
|---|---|
| [1. What AptiQuiz is](01-overview.md) | The problem, the solution, and how AptiQuiz meets each requirement of the brief. |
| [2. Play a Match](02-play-a-match.md) | How a Host and a Player use the application, step by step. |
| [3. How a Match runs](03-match-flow.md) | The phases of a Match and the timers that control them. |
| [4. Scoring](04-scoring.md) | How the server calculates points, ranks, and final results. |
| [5. Network delay](05-network-delay.md) | How AptiQuiz is fair to players on slow and fast connections. |
| [6. Reconnection](06-reconnection.md) | What happens when a player refreshes or loses the connection. |
| [7. Cheating resistance](07-cheating-resistance.md) | What a student can try, and how the server stops it. |
| [8. College League](08-college-league.md) | How scores from many Rooms go into one league table. |
| [9. The 50-player test](09-fifty-player-test.md) | How we tested 50 players, how to run the test, and the result. |
| [10. System design](10-system-design.md) | The parts of the system and how data moves between them. |
| [11. Technologies](11-technologies.md) | Each technology that we use, what it does, and why we chose it. |
| [12. Run and check the code](12-run-and-check.md) | How to install, start, and test the application. |
| [13. Limits and next steps](13-limits.md) | What AptiQuiz does not do yet. |

## The short version

- A Host makes a Question Set and creates a Room. The Room gets a six-character Join Code.
- Up to 50 players join with the code and a name. They do not need an account.
- The server sends each Question to all players at the same time. Each player has 30 seconds.
- A correct answer gets 500 to 1000 points. A faster answer gets more points. A wrong answer gets 0 points.
- After each Question, all players see the correct answer and the Leaderboard.
- At the end, each player sees their accuracy, average speed, and topic strengths.
- Signed-in players add their score to a weekly College League.
- The server controls all time and all scores. The player's device clock never decides a result.

## Other documents

- [Project README](../../README.md): the project introduction and the setup summary.
- [Architecture](../../Architecture.md): the full technical reference.
- [Problem statement](../../PS.md): the official brief.
- [Deployment guides](../guide/README.md): how we deploy to Dokploy.
- [Architecture decisions](../ADR/README.md): why we made the large technical decisions.
