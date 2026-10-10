# 1. What AptiQuiz Is

## The problem

Most campus placements start with an aptitude test. Many capable students fail this test. The cause is often speed and pressure, not ability.

Students usually practise alone with a PDF. This practice is slow and dull. It does not give real time pressure, and it does not put other people in the room.

## The solution

AptiQuiz is a live multiplayer quiz for aptitude practice. Up to 50 students join one Room. They see the same Question at the same time. They answer against a clock. After each Question, a Leaderboard shows who went up and who went down.

The game is fast and competitive, so students want to play again. Colleges can compare their students in a College League.

## Who uses AptiQuiz

| Person | What they do |
|---|---|
| Host | Writes Question Sets, creates a Room, and starts the Match. A Host must sign in and select a Home College. |
| Player (Participant) | Joins a Room with a Join Code and a display name, then answers the Questions. A player can be a Guest or a signed-in User. |
| Admin | Uses the admin area. Only a verified email in the `ADMIN_EMAILS` list is an Admin. |

## How AptiQuiz meets the brief

### The core requirements

| Requirement | What AptiQuiz does | Read more |
|---|---|---|
| 1. Question authoring | A Host creates Question Sets. Each Question has text, 2 to 6 options, one correct answer, a topic, and a difficulty. A Question can also have an image or a data table. The Host can edit, reorder, and reuse sets. | [Play a Match](02-play-a-match.md) |
| 2. Rooms | A Host creates a Room from a set. The Room gets a short Join Code, a link, and a QR code. Players join from any device with a name. The Lobby shows who is in. Only the Host can start. | [Play a Match](02-play-a-match.md) |
| 3. Live play | All players get the Question at the same time, with a countdown. The Round closes when time is up or when all players have answered. Then the server shows the correct answer and the Round scores. | [How a Match runs](03-match-flow.md) |
| 4. Speed and accuracy | A correct answer gets more points when it is faster. A wrong answer gets 0 points. Players see the rules in the Lobby before the start. | [Scoring](04-scoring.md) |
| 5. Live Leaderboard | After each Question, players see ranks and movement (up or down). At the end, each player sees accuracy, average speed, and topic strengths. | [Scoring](04-scoring.md) |
| 6. College League | Each Room belongs to a college. Scores go into a weekly table of top players and top colleges. | [College League](08-college-league.md) |

### The technical requirements

| Requirement | What AptiQuiz does | Read more |
|---|---|---|
| The server is the referee | The server opens and closes each Question. The server records when each answer arrives. The server calculates all scores. | [How a Match runs](03-match-flow.md) |
| Fair under network delay | The server measures each connection. It gives back a small, limited amount of time to slow connections. | [Network delay](05-network-delay.md) |
| Reconnection | A player who refreshes gets back the same score, the current Question, and their answer. Other players see no change. | [Reconnection](06-reconnection.md) |
| Cheating resistance | Each player gets a different option order. The correct answer stays on the server until the reveal. The server ignores late and duplicate answers. | [Cheating resistance](07-cheating-resistance.md) |
| Works with 50 players | A test script plays a full Match with 50 virtual players. It passed on the live servers. | [The 50-player test](09-fifty-player-test.md) |

### Extra items

- Reduced-motion support for people who do not want animation.
- Screen-reader announcements for live changes.
- Text labels for all results, so meaning never depends on colour only.
- Bots that you can add to your own Room for practice or a demonstration.
- Five starter Question Sets.
