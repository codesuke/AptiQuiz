# 7. Cheating Resistance

The brief asks for three minimum protections. AptiQuiz has these three and more.

## The three minimum protections

### 1. A different option order for each player

Each player sees the options in a different order. The order is also different for each Question.

The server makes the order from a seed. The seed has three parts: a random value for the Room, the Question number, and the player. The same player always gets the same order for the same Question. A refresh therefore does not change the order.

The option ids are also different for each player. The server makes them with a hash of the same seed. Two friends therefore cannot compare ids to share an answer.

### 2. The correct answer stays on the server

The server never sends the correct answer before the reveal. Before the reveal, the browser gets only the Question text and the options. It does not get:

- the correct option,
- whether an answer is correct,
- the points of an answer.

The server builds each public Question field by field. It never copies the stored Question, because the stored Question contains the correct answer.

The 50-player test checks this. In one run it examined 2 269 messages before the reveals. None contained the answer.

### 3. Late and duplicate answers are ignored

| Answer | Result |
|---|---|
| Arrives after the deadline | Rejected: `answer_too_late` or `round_not_open`. |
| Second answer to the same Question | Rejected: `already_answered`. |
| The same request sent again | The server returns the first result. It does not add points again. |

The server uses its own arrival time. The device clock of the player has no effect.

## What else a student can try

| A student tries to… | What happens |
|---|---|
| Read the answer in the browser developer tools | The answer is not in the browser before the reveal. |
| Tell a friend "it is option B" | The friend has a different order. |
| Change the device clock | The server ignores the device clock. |
| Fake a slow connection to get more time | The server measures the delay itself. The correction is 100 ms at most. See [Network delay](05-network-delay.md). |
| Take the place of another player with the same name | A name gives no access. Only the secret Resume Token restores a player. |
| Start or control the Match | Only the Host account can start. Other players get `not_room_host`. |
| Send many events quickly to overload the server | Each connection can send 30 events at once. The budget fills again at 10 events each second. A connection that sends more is disconnected and logged. |
| Fill the Room with fake players | A Room accepts 50 players at most. The event limit also stops one connection from sending many joins. |
| Add false points to the League | Only the server writes scores. Only signed-in players with a verified email count. |
| Use a false connection ticket | The server checks the signature of each ticket. A ticket expires after 60 seconds. |

## What AptiQuiz does not stop

These protections stop most cheating. They cannot stop all cheating. For example, a student can still look up an answer on a second device. A Host can reduce this risk in a supervised room.

## Where the code is

| Protection | Location |
|---|---|
| Option order and option ids | `Apti-App/packages/game-engine` (`orderOptions`) |
| Answer rules (late, duplicate) | `Apti-App/apps/game-server/src/rooms.ts` |
| Event limit | `Apti-App/apps/game-server/src/event-rate-limit.ts` |
| Resume Token | `Apti-App/apps/game-server/src/resume-token.ts` |
| Connection tickets | `Apti-App/packages/socket-ticket` |
