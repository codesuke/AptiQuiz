# AptiQuiz Architecture

Last update: 2026-10-10

## Purpose

AptiQuiz is a multiplayer aptitude quiz application. The server controls game time and game state.

The repository has two main areas. The repository root contains the project documents. `Apti-App/` contains the application workspace.

This document uses the principles of ASD-STE100 Simplified Technical English. Project terms and software names are technical nouns.

## Current Status

The application is an initial working foundation. It does not contain a complete multiplayer match.

The following functions are available:

- The web application serves the foundation page.
- The web application supplies `GET /api/health`.
- The Game Server supplies `GET /health`.
- The Game Server accepts Socket.IO connections.
- The Game Server sends the `server:ready` event.
- The Game Server accepts the `time:ping` event.
- The Game Engine controls the initial game phases.
- The simulator opens 50 connections by default.
- The database package generates a Prisma client.

The following functions are not available:

- A Host cannot create or control a Room.
- A Participant cannot join a Room or submit an Answer.
- The application does not calculate a live Leaderboard.
- The application does not save a completed Match.
- The application does not implement reconnect tokens.
- The application does not implement authentication.
- The application does not use Redis or Kafka.
- The application is not deployed.

## System Diagram

```text
Browser
  |
  | HTTPS
  v
Apti-App/apps/web
  |-- GET /api/health
  |-- Next.js user interface
  |
  | WebSocket
  v
Apti-App/apps/game-server
  |-- GET /health
  |-- server:ready
  `-- time:ping

Shared packages
  |-- Apti-App/packages/contracts
  |-- Apti-App/packages/game-engine
  |-- Apti-App/packages/database
  `-- Apti-App/packages/typescript-config
```

The diagram shows only the implemented interfaces. It does not show planned gameplay interfaces.

## Repository Layout

```text
/
|-- Apti-App/                     # pnpm and Turborepo workspace
|   |-- apps/
|   |   |-- web/                  # Next.js application
|   |   |-- game-server/          # Node.js and Socket.IO server
|   |   `-- simulator/            # Socket.IO connection simulator
|   |-- packages/
|   |   |-- contracts/            # Zod schemas and event types
|   |   |-- game-engine/          # Game state and score rules
|   |   |-- database/             # Prisma schema and client adapter
|   |   `-- typescript-config/    # Shared TypeScript configuration
|   |-- .env.example              # Environment variable template
|   |-- biome.json                # Format and lint configuration
|   |-- package.json              # Workspace commands
|   |-- pnpm-lock.yaml            # Dependency lockfile
|   |-- pnpm-workspace.yaml       # Workspace package list
|   `-- turbo.json                # Task configuration
|-- docs/                         # ADRs and project records
|-- AGENTS.md                     # Agent instructions
|-- Architecture.md               # Architecture source of truth
|-- CONTEXT.md                    # Product terms
|-- DESIGN.md                     # User interface rules
|-- PS.md                         # Product problem statement
`-- README.md                     # Project introduction and setup
```

## Workspace Rules

The project uses pnpm for all workspace commands. `Apti-App/package.json` specifies pnpm 11.24.0.

Run all pnpm commands from `Apti-App/`. Do not add an npm or Yarn lockfile.

An application can import a shared package. A shared package must not import an application.

Use package exports for cross-package imports. Do not use a relative path across package boundaries.

Keep user interface code in `Apti-App/apps/web`. Create a shared user interface package only when a second application needs it.

## Components

### Web Application

Location: `Apti-App/apps/web`

The web application uses Next.js and React. Server Components are the default component type.

The foundation page shows the product direction. The Join and Host buttons do not start product flows.

The `GameServerStatus` component makes a WebSocket connection to the Game Server. The component shows connection status and round-trip time.

The web application does not control game deadlines or scores.

### Game Server

Location: `Apti-App/apps/game-server`

The Game Server is a long-running Node.js process. Socket.IO supplies the WebSocket interface.

The Game Server uses server time for its responses. The browser time does not control a game decision.

The current process keeps no Room state. A later product slice must add Room orchestration.

The Game Server uses these default values:

| Item | Default value | Source |
|---|---:|---|
| HTTP and WebSocket port | `3001` | `src/config.ts` |
| Allowed web origin | `http://localhost:3000` | `src/config.ts` |
| Log level | `info` | `src/config.ts` |

### Contracts Package

Location: `Apti-App/packages/contracts`

The Contracts package contains Zod schemas and TypeScript event types. The Game Server uses these schemas to validate external data.

The package currently defines these interfaces:

- `roomCodeSchema`
- `displayNameSchema`
- `timePingSchema`
- `timePingResponseSchema`
- `serverReadySchema`

Put each new Socket.IO payload and acknowledgment in this package. Validate each external payload at run time.

### Game Engine

Location: `Apti-App/packages/game-engine`

The Game Engine is a pure TypeScript package. It does not use React, Socket.IO, Prisma, environment variables, or system time.

The public interface contains these functions:

```ts
createGameState(roomId, questionCount): GameState
transitionGame(state, command, serverTime): TransitionResult
calculateScore(effectiveElapsedMs, durationMs): number
```

The Game Engine supports these phases:

```text
LOBBY -> QUESTION_OPEN -> QUESTION_REVEAL -> LEADERBOARD -> FINISHED
```

The caller supplies the server time. The Game Engine validates each phase transition.

The provisional score is from 500 through 1000 points. A shorter elapsed time gives a higher score.

### Database Package

Location: `Apti-App/packages/database`

PostgreSQL is the selected persistent database. Prisma ORM supplies the schema and generated client.

`Apti-App/packages/database/prisma/schema.prisma` is the schema source of truth. Do not edit generated client files.

The schema contains these main models:

- `College`
- `QuestionSet`
- `Question`
- `Room`
- `Participant`
- `Round`
- `Answer`
- `MatchResult`

The unique key on `(roundId, participantId)` prevents two stored Answers for one Participant and one Round.

The application does not use these models in a product flow at this time.

### Simulator

Location: `Apti-App/apps/simulator`

The simulator uses the public Socket.IO interface. It creates 50 connections by default.

Each simulated player connects and sends one `time:ping` event. The simulator reports the connection count and latency values.

The simulator does not simulate a complete Match. Do not use its result as proof of complete Match capacity.

## Implemented Data Flow

The current WebSocket data flow is as follows:

1. The browser connects to the Game Server.
2. The Game Server sends `server:ready`.
3. The browser sends `time:ping` with `clientSentAt`.
4. The Game Server validates the payload.
5. The Game Server sends an acknowledgment with `serverReceivedAt`.
6. The browser calculates and shows the round-trip time.

The Game Engine is not connected to the Socket.IO handlers at this time.

## Planned Match Data Flow

This section describes an accepted plan. The flow is not implemented.

1. The Host creates a Room through the web application.
2. The web server checks the User and the Question Set.
3. The web server sends an authenticated request to the Game Server.
4. Each Participant connects with a Socket Ticket or a Resume Token.
5. The Game Server validates each command.
6. The Game Server calls the Game Engine.
7. The Game Server sends the returned domain events.
8. The application saves completed Match results in PostgreSQL.

## Security Rules

The following rules apply to new product code:

- Do not send `correctOptionId` before the reveal phase.
- Use server time to accept or reject an Answer.
- Give each mutation an idempotency key.
- Hash Host tokens and Resume Tokens before database storage.
- Do not send `DATABASE_URL` or server secrets to the browser.
- Use an explicit Cross-Origin Resource Sharing origin outside local development.

ADR 0007 accepts Better Auth and short-lived Socket Tickets. The application does not implement this decision at this time.

## Environment Variables

`Apti-App/.env.example` contains the environment variable template.

| Variable | Runtime | Status | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_GAME_SERVER_URL` | Browser | Implemented | Selects the public Game Server URL. |
| `NEXT_PUBLIC_APP_URL` | Web | Reserved | Selects the canonical web URL. |
| `GAME_SERVER_PORT` | Game Server | Implemented | Selects the HTTP and WebSocket port. |
| `GAME_SERVER_ORIGIN` | Game Server | Implemented | Selects the allowed web origin. |
| `LOG_LEVEL` | Game Server | Implemented | Selects the Pino log level. |
| `DATABASE_URL` | Database tools | Implemented | Connects Prisma to PostgreSQL. |
| `GAME_SERVER_SECRET` | Web and Game Server | Planned | Signs internal requests and Socket Tickets. |
| `BETTER_AUTH_SECRET` | Web | Planned | Signs Better Auth data. |
| `BETTER_AUTH_URL` | Web | Planned | Selects the Better Auth URL. |
| `GOOGLE_CLIENT_ID` | Web | Planned | Identifies the Google OAuth client. |
| `GOOGLE_CLIENT_SECRET` | Web | Planned | Authenticates the Google OAuth client. |
| `ADMIN_EMAILS` | Web | Planned | Contains the Admin email allow-list. |
| `GMAIL_USER` | Web | Planned | Identifies the Gmail account. |
| `GMAIL_APP_PASSWORD` | Web | Planned | Authenticates the Gmail SMTP connection. |

Do not commit an `.env` file or a real secret.

## Scale Plan

Use one Game Server process for the first complete application.

Use this sequence for scale work:

1. Build one complete Match.
2. Test one complete Match with 50 Participants.
3. Measure event-loop delay, processor use, memory use, broadcast latency, and reconnect success.
4. Add Redis room storage only when the application needs a second Game Server process.
5. Add the Socket.IO Redis adapter only when the application uses more than one Game Server process.
6. Add a background job system only when a measured database task affects a live Round.
7. Consider Kafka only when multiple consumers need a persistent and replayable event stream.

Do not add Kafka placeholders during the core application build.

## Deployment Plan

ADR 0008 accepts Dokploy as the deployment target. This deployment does not exist at this time.

The accepted target has these parts:

- `https://aptiquiz.codesuke.in` supplies the web application.
- `https://game.aptiquiz.codesuke.in` supplies the Game Server.
- Traefik terminates Transport Layer Security and proxies WebSocket connections.
- The web container applies Prisma migrations before start.
- The Game Server does not apply database migrations.
- The existing Dokploy PostgreSQL service stores persistent data.
- The available Redis service stays unused until measurements require it.

## Failure Rules

Only the health and time-ping failure behavior exists at this time. The other rules are requirements for future product slices.

- If a `time:ping` payload is invalid, the Game Server returns `invalid_time_ping`.
- If an HTTP path is not available, the Game Server returns HTTP 404 and `not_found`.
- If a future Answer is late, the Game Server must reject the Answer by server time.
- If a future Answer is a duplicate, the Game Server must not add the score two times.
- If a future socket disconnects, the application must restore the Participant from a full Room snapshot.
- If PostgreSQL is not available during a future Round, the in-memory Round must continue.
- If the Game Server restarts before Redis exists, active in-memory Rooms are lost.

## Architecture Decisions

- [ADR 0006](docs/ADR/0006-typescript-monorepo-and-realtime-runtime.md) selects the TypeScript monorepo and the separate Game Server.
- [ADR 0007](docs/ADR/0007-better-auth-and-socket-tickets.md) selects Better Auth and signed Socket Tickets.
- [ADR 0008](docs/ADR/0008-dokploy-deployment-redis-deferred.md) selects Dokploy and defers Redis use.

## Verification

Run these commands from the repository root:

```bash
cd Apti-App
pnpm install
pnpm check
```

Start the Game Server before you start the simulator:

```bash
cd Apti-App
pnpm --filter @aptiquiz/game-server start
```

Run the simulator in a second terminal:

```bash
cd Apti-App
pnpm simulate
```

## Claims Ledger

| Claim | Verdict | Source | Required action | Flags to |
|---|---|---|---|---|
| `Apti-App/` is a pnpm and Turborepo workspace. | VERIFIED | `Apti-App/package.json`, `Apti-App/pnpm-workspace.yaml`, and `Apti-App/turbo.json` | Keep the files synchronized. | - |
| pnpm 11.24.0 is the selected package manager. | VERIFIED | `Apti-App/package.json` | Update this claim when the pinned version changes. | - |
| The web application and Game Server supply health routes. | VERIFIED | `Apti-App/apps/web/src/app/api/health/route.ts` and `Apti-App/apps/game-server/src/server.ts` | Keep the route tests successful. | - |
| The Game Server validates the `time:ping` payload. | VERIFIED | `Apti-App/packages/contracts/src/index.ts` and `Apti-App/apps/game-server/src/server.ts` | Add tests when the event interface changes. | - |
| The Game Engine controls phase changes and provisional scores. | VERIFIED | `Apti-App/packages/game-engine/src/index.ts` and `index.test.ts` | Keep game rules outside transport handlers. | - |
| The simulator creates 50 connections by default. | VERIFIED | `Apti-App/apps/simulator/src/index.ts` and `docs/build-memory.yaml` | Repeat the test after transport changes. | - |
| A complete 50-Participant Match is not implemented. | VERIFIED | `Apti-App/packages/contracts/src/index.ts` contains no Room or Answer events. | Implement and test the complete flow. | - |
| Authentication, Dokploy deployment, Redis, and Kafka are not implemented. | VERIFIED | `Apti-App/package.json`, application source, ADR 0007, and ADR 0008 | Change this claim only after implementation and verification. | - |
