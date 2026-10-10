# 10. System Design

## The main parts

AptiQuiz has two applications and some shared packages.

```text
             Browser (phone or laptop)
               │                   │
          HTTPS│                   │WebSocket (live)
               ▼                   ▼
     ┌─────────────────┐   ┌─────────────────┐
     │ Web application │──►│   Game Server   │
     │    (Next.js)    │   │   (Socket.IO)   │
     └────────┬────────┘   └────────┬────────┘
              │                     │
              ▼                     ▼
          ┌─────────────────────────────┐
          │    PostgreSQL database      │
          └─────────────────────────────┘
```

| Part | What it does |
|---|---|
| Web application | Shows the pages. Controls accounts, Question Sets, Room creation, colleges, and the League. |
| Game Server | Runs the live Matches. Controls time, answers, scores, and reconnection. |
| PostgreSQL database | Keeps permanent data: accounts, colleges, Question Sets, Rooms, players, and results. |

## Why two applications

The web application answers a request and then stops. A live game needs a process that runs all the time. It must hold timers and open connections. For this reason, the Game Server is a separate, long-running process.

## The shared packages

The applications share code through packages in `Apti-App/packages/`:

| Package | What it contains |
|---|---|
| `game-engine` | The game rules: the phases, the points formula, the option order, and the delay correction. It has no network, database, or clock. It is easy to test. |
| `contracts` | The shape of each message between the browser and the servers. Each side checks each message against these shapes. |
| `socket-ticket` | Signs and checks the short connection tickets. |
| `database` | The database schema and the database functions. |
| `typescript-config` | Shared TypeScript settings. |

## How data moves

### Create a Room

1. The Host clicks **Create Room** in the web application.
2. The web application checks the Host and the Question Set.
3. It saves the Room and a copy of the Questions in the database.
4. It sends the Room to the Game Server in a signed message. This message expires after 60 seconds.
5. The Game Server keeps the Room in memory.

### Connect a player

1. The browser asks the web application for a connection ticket.
2. If the person is signed in, the web application gives a signed ticket. The ticket expires after 60 seconds. A Guest gets no ticket.
3. The browser connects to the Game Server with the ticket.
4. The Game Server checks the ticket. It identifies the connection as a User or a Guest.

### Play a Question

1. The Game Server opens the Question with the Game Engine.
2. It sends each player their own view of the Question.
3. A player sends an answer. The server records the arrival time first.
4. The server checks the answer and calculates the points with the Game Engine.
5. The server closes the Round, then sends the reveal and the Leaderboard to all players.

### Finish the Match

1. After the last Question, the Game Server calculates each final result.
2. It saves all results in the database in one transaction.
3. It sends the final results to all browsers.
4. The League page reads these results from the database.

## Where live data is kept

Live Room data is in the memory of the Game Server. This is fast and simple for one server. Permanent data is in PostgreSQL.

If the project needs more than one Game Server, the plan is to move the live data to Redis. [ADR 0008](../ADR/0008-dokploy-deployment-redis-deferred.md) records this decision.

## Deployment

| Service | Address |
|---|---|
| Web application | `https://aptiquiz.codesuke.in` |
| Game Server | `https://game.aptiquiz.codesuke.in` |

Both services run on Dokploy as Docker containers. Traefik gives HTTPS and passes WebSocket connections. The [deployment guides](../guide/README.md) give the full procedure.

For the complete technical reference, read [Architecture.md](../../Architecture.md).
