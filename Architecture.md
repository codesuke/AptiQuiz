# AptiQuiz Architecture

Last update: 2026-10-10

## Purpose

AptiQuiz is a multiplayer aptitude quiz application. The server controls game time and game state.

The repository has two main areas. The repository root contains the project documents. `Apti-App/` contains the application workspace.

This document uses the principles of ASD-STE100 Simplified Technical English. Project terms and software names are technical nouns.

## Current Status

The application is an initial working foundation. It does not contain a complete multiplayer match.

The following functions are available:

- The web application serves a task-focused home page with links to Question Sets and hosting setup.
- The web application supplies `GET /api/health`.
- The web application supports email and password sign-up, sign-in, and sign-out.
- The web application supports Google sign-in when Google credentials are configured.
- The web application sends a verification email after email sign-up. The home page shows a notice with a resend button to an unverified User. The `/verify-email` page shows the result of a verification link and lets the User request a new link.
- The web application supports password reset. A User requests a one-time reset link at `/forgot-password` and sets a new password at `/reset-password`.
- A verified User in `ADMIN_EMAILS` can open the placeholder `/admin` area.
- A suspended User cannot create a session or use an existing session on the next request.
- A signed-in User searches the approved Colleges at `/college` and sets one Home College. The account menu shows it.
- The hosting setup link opens `/host`. A Guest is sent to sign in. A User without a Home College is sent to `/college` and returns to `/host` after choosing one. The page lists the readable Question Sets and creates a Room.
- The web application issues short-lived Socket Tickets to signed-in Users.
- The browser connects to the Game Server as a User or a Guest and shows the identity reported by `server:ready`.
- The Game Server supplies `GET /health`.
- The Game Server accepts Socket.IO connections.
- The Game Server identifies each connection as a User or a Guest from its Socket Ticket.
- The Game Server sends the `server:ready` event with the connection identity.
- The Game Server accepts the `time:ping` event.
- The Game Engine controls the initial game phases.
- A Host creates a Room from an owned Question Set or the starter set. The Room stores the Host, the Home College, the Question Set, a stable Question snapshot, and a unique six-character Join Code.
- The Host Lobby at `/host/rooms/[roomId]` shows the Join Code, the join link, a QR code, Copy and Share buttons, the live roster, the scoring rule, and Start.
- A Guest or a User joins at `/join` or `/join/[code]` with a display name. The Lobby roster updates live for each member of that Room.
- The Game Server keeps a maximum of 50 Participants in each Room. Only the Host can start the Room, and only one time.
- Start opens the first Round: one server `startsAt` and a deadline 30 seconds later. Each Participant receives `round:state` with the public Question in a stable option order of their own, with option ids that are opaque to them. The Host receives the authored order. Both browsers show a countdown from server timestamps.
- A joined Participant answers the open Round with `round:answer`. The Game Server accepts the first valid Answer received at or before the deadline, by server receipt time. It scores the Answer with delay compensation from server-initiated `latency:ping` samples. The acknowledgement and later views do not show correctness before the reveal. The Lobby shows the scoring rule and the delay policy from the server values.
- The Round closes once: at the server deadline, or earlier when every connected Participant has answered. Then each Participant receives the correct option in their own option ids, their result, and the Round scores of all Participants. The Host receives the same reveal with the authored ids.
- After a reveal, only the Host advances. Each next Question opens with a new server deadline. After the last Question, the Room moves to `FINISHED`, the browsers show "Match finished.", and the Game Server saves one `MatchResult` for each joined Participant and writes the `FINISHED` status and completion time to PostgreSQL in one transaction. The Room moves to `FINISHED` only after that commit. If the commit fails, the advance returns `advance_failed` and the Host can send it again. A complete Match was played in two headless browsers on 2026-10-10.
- A Participant who refreshes or reconnects resumes the same Participant with a Resume Token. They get the Room phase, the roster, the current Round in their own option order with their locked Answer, the server deadline, and their score from revealed Rounds. A resume adds no Participant and broadcasts no join. Guest and signed-in refreshes in the Lobby and during an open Round were checked in headless browsers on 2026-10-10.
- The simulator creates a starter Room through the web application as a signed-in Host, joins 50 virtual Guests into its Lobby by default, checks that the public Lobby holds that many distinct Participants, and plays every starter Question.
- The database package generates a Prisma client.

The following functions are not available:

- The application does not calculate a live Leaderboard.
- The application does not show the final results to the browsers. The saved `MatchResult` rows are not yet read by any screen.
- The application does not use Redis or Kafka.
- The web app and Game Server are deployed on Dokploy. Both public HTTPS health endpoints responded on 2026-10-10; WebSocket, CORS, and migration checks remain open in issue #11.

## System Diagram

```text
Browser
  |
  | HTTPS
  v
Apti-App/apps/web
  |-- GET /api/health
  |-- POST /api/socket-ticket
  |-- Next.js user interface
  |
  | WebSocket
  v
Apti-App/apps/game-server
  |-- GET /health
  |-- Socket Ticket handshake
  |-- server:ready
  `-- time:ping

Shared packages
  |-- Apti-App/packages/contracts
  |-- Apti-App/packages/game-engine
  |-- Apti-App/packages/socket-ticket
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
|   |   |-- socket-ticket/        # Socket Ticket signing and verification
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

The home page leads to Question Set authoring and hosting setup. It labels Room joining and creation as upcoming because those flows are not implemented. Its account menu reflects the current active session. Connection diagnostics remain available in a disclosure at the bottom of the page.

The sign-in and sign-up pages show "Continue with Google" only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are both set. Without them, Better Auth has no Google provider and the pages show only the email form. A new Google User gets the email-verified status from the Google `email_verified` claim. A Google sign-in links to an existing User with the same email only when that User's email is verified. Otherwise the sign-in page tells the User to use "Forgot password?". A completed password reset verifies the email, because the User opened the reset link from that inbox. After the reset, Google sign-in opens the same User. This rule prevents an unverified pre-registration from capturing a Google identity, and it gives the real owner of the email a recovery path. The web application does not set the email-verified status of a new Google User to true by force. An unverified Google address must not satisfy the Admin check.

After email sign-up, Better Auth sends a verification email. The link expires after 1 hour. The link returns to `/verify-email`. That page reads the current session and the User row. It shows "Email verified." only when the signed-in User is verified. Without a session, it asks the visitor to sign in. For an unverified User or a failed link, it shows a form to request a new link.

`/forgot-password` requests a reset link. The response is the same for a known and an unknown email. The link works one time and expires after 60 minutes. A successful reset ends all sessions of the User and sets the email-verified status to true. Better Auth limits the resend and reset requests to 3 for each client in 5 minutes.

The web application sends auth email through Gmail SMTP when `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set. Without them, development and test write the email to the server log, and other environments refuse to send.

`GET /api/colleges?q=` searches the approved Colleges. `PUT /api/home-college` sets the signed-in User's one Home College. Both return 401 with no session and 403 for a suspended User. The seed (`pnpm --filter @aptiquiz/database db:seed`) loads the approved Colleges and is safe to run again. A Guest has no Home College and sees no College picker. No Pending College state exists in the MVP. `requireHostCollege` returns the Home College that a new Room must store, or the refusal `home_college_required`. The page `/college` accepts a `next` value only when it is `/host`. A User who already has a Home College sees a "Continue to hosting" link there. The College search accepts at most 80 characters and 6 words, and returns 400 otherwise. The Socket Ticket `homeCollegeId` claim holds the User's current Home College id, or `null` without one. The web application reads it for each new ticket, so a change applies to the next connection.

The `/admin` placeholder reads the User's current verification and suspension state. It derives Admin access from the current `ADMIN_EMAILS` setting for each request. Guests are redirected to sign in; other Users see a not-allowed page.

The `GameServerStatus` component requests a Socket Ticket before each Socket.IO connection attempt, including automatic reconnects. A 401 response connects as a Guest; another ticket request failure does not downgrade the connection to Guest. The component shows the identity from `server:ready`, connection status, and round-trip time.

`POST /api/socket-ticket` reads the current Better Auth session and User row. It returns 401 with no session, 403 for a suspended User, or a 60-second signed ticket with the current role and email-verified status. It sets `Cache-Control: no-store`.

The web application does not control game deadlines or scores.

### Game Server

Location: `Apti-App/apps/game-server`

The Game Server is a long-running Node.js process. Socket.IO supplies the WebSocket interface.

The Game Server uses server time for its responses. The browser time does not control a game decision.

The process keeps live Room state in memory. Each Room has its registration, its Game Engine state, its roster, and its join and start idempotency records.

`POST /internal/rooms` accepts a Room from the web application. The body is `{ "registration": <token> }`. The token is an HS256 JSON Web Token signed with `GAME_SERVER_SECRET`, with the audience `aptiquiz-game-server-internal` and a lifetime of 60 seconds. A bad token gets 401, a bad body gets 400, a body larger than 2 MB gets 413, and a Join Code of another live Room gets 409. A repeated registration of the same Room is accepted and does not reset the roster.

The Socket.IO Room commands are:

- `room:host`: only the Host User subscribes to the Lobby.
- `room:join`: a Guest or a User joins a Room in the Lobby. A User is one Participant in each Room. A Guest is identified by the join idempotency key. The server reserves the slot before the database write, so a Room never has more than 50 Participants. A join that ends after the start is refused.
- `room:advance`: only the Host advances, and only from `QUESTION_REVEAL`. The Game Engine `ADVANCE` transition opens the next Question through the same path as start, or moves the Room to `FINISHED` after the last Question. A replayed key returns its first result. A new key while a Round is open gets `round_not_revealed`, so no command can skip a Question or open two Rounds. A finished Room refuses with `room_finished`.
- `room:resume`: a Participant reclaims their place on a new connection with `{joinCode, resumeToken}`. The registry finds the token hash in that Room only. A token of a signed-in User's Participant works only on a connection authenticated as that User. A malformed, unknown, or other-Room token gets `invalid_resume_token` and no Participant data. A success subscribes the socket like a join and returns the Lobby, the current Round view for that Participant, and `score`. The score uses the same totals as the Leaderboard and counts revealed Rounds only. A resume adds no Participant, uses no roster place, broadcasts nothing, and does not touch the database. A repeated resume returns the same result.
- `room:start`: only the Host starts the Room. The Game Engine `START` transition leaves `LOBBY` and opens Question 0 for the configured Round duration. A retry with the same key returns the first result and never opens another Round or moves the deadline.

`round:state` sends a Round view to one receiver. Each Participant has the channel `participant:<roomId>:<participantId>` and receives their own option order. The order is seeded by a random salt for each Room, the Question index, and the Participant id. Option ids are hashed from the same seed. The Host channel `host:<roomId>` receives the authored order. The `room:host` and `room:join` acknowledgements include the current Round view, or `null` in the Lobby, so a reconnecting browser recovers the Round. The Game Server builds the public Question field by field. It never copies a stored Question, because the stored Question holds `correctOptionId`.

`round:answer` accepts an Answer only from a socket that joined the Room as a Participant. The Host is not a Participant. The handler stamps the server receipt time before it validates the payload. The registry then applies these rules in order:

1. A replayed idempotency key returns the original accepted result.
2. The Room must be in `QUESTION_OPEN`, and the Answer must name the current Question index.
3. The receipt time must be at or before `endsAt`. There is no grace period, and delay compensation never makes a late Answer valid.
4. A Participant's second Answer is refused as `already_answered`.
5. The option id must be one of this Participant's opaque ids for the Round.

An accepted Answer stores its points: `500 + floor(500 × (1 − Effective Response Time / duration))` for a correct Answer and 0 for a wrong one. Effective Response Time is the elapsed server time minus `min(median RTT / 2, 100 ms)`, clamped to the duration and floored to a 100 ms bucket. The median is taken over the socket's last 5 `latency:ping` samples. The server sends a ping every 2 seconds after a join, and a ping without an acknowledgement within 2 seconds is not a sample. With no sample, compensation is 0. A client can delay its ping acknowledgements to inflate its median, so the 100 ms cap bounds the largest possible gain. The Game Engine owns these rules. Answers stay in memory; #7 persists Match results.

The registry tracks the live sockets of each Participant. It closes the open Round through the Game Engine `CLOSE_QUESTION` transition in these cases:

- The deadline timer fires after `endsAt`. The timer is set when the Round opens and does not depend on any Answer.
- An accepted Answer, or the disconnect of a Participant's last socket, leaves every connected Participant with an Answer. Early closure needs at least one connected Participant.

The close happens only from `QUESTION_OPEN`, so a race between the timer and an Answer closes and reveals one time. The registry then publishes a revealed `round:state` to each receiver and `room:lobby` with `QUESTION_REVEAL`. After closure, a new Answer gets `round_not_open`, and a same-key replay returns the first result. The scores, Answers, and deadline do not change. Rejoin and host acknowledgements return the revealed view.

The Resume Token is base64url HMAC-SHA256 of `resume:<roomId>:<participantId>`, keyed by `GAME_SERVER_SECRET`. Only the joining socket's acknowledgement carries it. A join retried after a lost acknowledgement gets the same token, and the server stores only its SHA-256 hash: in memory, and in `Participant.resumeTokenHash`. The browser keeps the token in `localStorage` for each Join Code. On every connection it resumes before it shows itself online. It retries a lost acknowledgement at most 5 times. After a refusal it drops the token.

A Participant whose last socket disconnects during an open Round still counts as connected for early closure for 5 seconds. A refresh therefore does not close the Round for everyone. If the Participant does not return in that time, a scheduled re-check applies the normal early-closure rule. The re-check is bound to its Question, and the deadline never changes.

`createGameServer` accepts an injectable `now` clock and an injectable scheduler for the deadline timer. Every game time uses the clock. Socket Ticket and Room registration expiry use the wall clock, because the web server signs them against real time.

Each command is validated and gets a typed acknowledgement. A command without an acknowledgement callback is ignored. `room:lobby` sends the roster and the phase to the members of one Room only. The Lobby data does not contain `correctOptionId`. The Game Server writes Participants and the `RUNNING` status to PostgreSQL through `@aptiquiz/database`, and needs `DATABASE_URL`.

A Socket.IO connection middleware identifies each connection before any event handler runs. The middleware reads `ticket` from the handshake `auth` payload:

- No ticket: the connection is a Guest.
- A valid ticket: the connection is the User in the ticket.
- An expired ticket: the Game Server refuses the connection with `socket_ticket_expired`.
- Another ticket problem: the Game Server refuses the connection with `socket_ticket_invalid`.

The Game Server never changes a refused connection to a Guest. It keeps the identity in `socket.data.identity` and sends it in `server:ready`.

The Game Server does not start without `GAME_SERVER_SECRET`. The secret must contain at least 32 characters. The `dev` and `start` commands read `Apti-App/.env` if the file exists.

The Game Server uses these default values:

| Item | Default value | Source |
|---|---:|---|
| HTTP and WebSocket port | `3001` | `src/config.ts` |
| Round duration | `30000` ms | `src/config.ts` |
| Delay compensation cap | `100` ms | `src/config.ts` |
| Reconnect grace for early closure | `5000` ms | `src/config.ts` |
| Score bucket | `100` ms | `src/config.ts` |
| Latency sample interval, timeout, window | `2000` ms, `2000` ms, 5 samples | `src/config.ts` |
| Allowed web origin | `http://localhost:3000` | `src/config.ts` |
| Log level | `info` | `src/config.ts` |

### Contracts Package

Location: `Apti-App/packages/contracts`

The Contracts package contains Zod schemas and TypeScript event types. The Game Server uses these schemas to validate external data.

The package currently defines these interfaces:

- `roomCodeSchema`
- `roomRegistrationSchema`, `createRoomRequestSchema`, and `lobbySnapshotSchema`
- `roomHostSchema`, `roomJoinSchema`, `roomStartSchema`, and their response schemas
- `publicQuestionSchema`, `openRoundSchema`, and `roundViewSchema`
- `roundScoreSchema`, `roundResultSchema`, and `revealedRoundSchema`
- `roomAdvanceSchema` and `roomAdvanceResponseSchema`
- `resumeTokenSchema`, `roomResumeSchema`, and `roomResumeResponseSchema`
- `roundRulesSchema`, `lockedAnswerSchema`, `roundAnswerSchema`, `answerErrorSchema`, `roundAnswerResponseSchema`, and `latencyPingSchema`
- `displayNameSchema`
- `timePingSchema`
- `timePingResponseSchema`
- `serverReadySchema`
- `socketTicketSubjectSchema` and `socketTicketClaimsSchema`
- `socketHandshakeAuthSchema`
- `socketHandshakeErrorCodeSchema`
- `connectionIdentitySchema`

Put each new Socket.IO payload and acknowledgment in this package. Validate each external payload at run time.

### Game Engine

Location: `Apti-App/packages/game-engine`

The Game Engine is a pure TypeScript package. It does not use React, Socket.IO, Prisma, environment variables, or system time.

The public interface contains these functions:

```ts
createGameState(roomId, questionCount): GameState
transitionGame(state, command, serverTime): TransitionResult
calculateScore(effectiveElapsedMs, durationMs): number
orderOptions(options, seed): options
isAnswerOnTime(round, receivedAt): boolean
medianRoundTrip(samples): number | null
effectiveResponseTime(policy, startsAt, receivedAt, medianRttMs): number
scoreAnswer(policy, answer): number
```

`orderOptions` is a seeded shuffle. The same seed always gives the same order, and the input is not changed.

The Game Engine supports these phases:

```text
LOBBY -> QUESTION_OPEN -> QUESTION_REVEAL -> LEADERBOARD -> FINISHED
```

The caller supplies the server time. The Game Engine validates each phase transition.

The provisional score is from 500 through 1000 points. A shorter elapsed time gives a higher score.

### Socket Ticket Package

Location: `Apti-App/packages/socket-ticket`

The Socket Ticket package signs and verifies Socket Tickets. A Socket Ticket is an HS256 JSON Web Token. The secret is `GAME_SERVER_SECRET`.

The public interface contains these functions:

```ts
issueSocketTicket(subject, secret, now): Promise<string>
verifySocketTicket(ticket, secret, now): Promise<SocketTicketVerification>
```

The caller supplies the time. A ticket expires 60 seconds after issue. The audience is `aptiquiz-game-server`.

`verifySocketTicket` returns the claims or one of these reasons: `expired`, `tampered`, `wrong_audience`, or `malformed`.

Do not import this package into browser code. The browser bundle must not contain the signing code or the secret.

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

Room creation uses `College`, `QuestionSet`, `Question`, and `Room`. Room join uses `Participant`, which links to the joining User or to no User for a Guest. The Game Server writes the Room status `RUNNING` at start. After the last Question, `completeRoom` saves one `MatchResult` for each joined Participant, the Room status `FINISHED`, and the Room `completedAt` in one transaction. A repeated or concurrent attempt returns the first committed results and changes no row. A `MatchResult` stores the rank, score, correct Answers, the Question count (accuracy denominator), the rounded average Effective Response Time (null without accepted Answers), and the correct and total count for each Topic of the Room snapshot. It also stores the Participant College, the User ID (null for a Guest), and the email-verified status read from the User row at completion. The application does not use `Round` or `Answer` at this time. Live Answers stay in memory.

### Simulator

Location: `Apti-App/apps/simulator`

The simulator uses the public Socket.IO interface and the web Room and Socket Ticket routes. It creates a fresh starter Room with a Host session, or uses a supplied Room and Host ticket. It joins 50 independent Guests by default, up to the Room limit of 50.

Each simulated player connects, sends one `time:ping` event, and joins the Lobby. The Host reads the Lobby back and the simulator checks that it holds the requested number of distinct Participants. The Host then starts the Room and advances after each reveal. Fixed cohorts submit correct, wrong, duplicate (new key), exact-key replay, and deliberately late Answers, and one cohort stays silent in the first Round. The simulator scans every pre-reveal payload for correctness, explanation, or points, and checks revealed Round points against the starter fixture. The JSON report separates connected sockets from joined Participants, includes labelled client-observed acknowledgement latency, and never prints the Host session or ticket. Any failure or timeout exits nonzero.

During the second Question, a subset of Participants disconnects and resumes with its Resume Token, and the simulator compares identity, score, Answer state, option order, and deadline. After each reveal it compares the ordered Leaderboard across all viewers with the revealed Round points, and after the last Question it checks the saved results. No deployed run is recorded yet. Do not use its result as proof of complete Match capacity.

## Implemented Data Flow

The current WebSocket data flow is as follows:

1. The browser requests a fresh ticket from `POST /api/socket-ticket` before each connection attempt.
2. The web application checks the current session, suspension state, verified email, and Admin allow-list before it signs a ticket. With no session, the browser connects without a ticket as a Guest.
3. The browser connects to the Game Server with the ticket in Socket.IO handshake `auth`, when one exists.
4. The Game Server identifies the connection as a User or a Guest, or refuses the connection.
5. The Game Server sends `server:ready` with the identity.
6. The browser sends `time:ping` with `clientSentAt`.
7. The Game Server validates the payload and acknowledges it with `serverReceivedAt`.
8. The browser shows the returned identity and round-trip time.

The Room registry calls the Game Engine for the `START`, `CLOSE_QUESTION`, and `ADVANCE` transitions and for the timing and score rules.

## Planned Match Data Flow

This section describes an accepted plan. Steps 1 to 7 are implemented. Step 8 belongs to #7.

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
- A suspended User cannot create a new session. The web application checks the current User row before accepting an existing session on a page request, and Better Auth rejects suspended sessions on its HTTP endpoints.
- Admin access requires a verified email in the current `ADMIN_EMAILS` allow-list. The role is not stored in the database.
- Google sign-in links only to an existing User whose email is verified. A completed password reset verifies the email. A new Google User is verified only when the Google `email_verified` claim is true.
- Password reset and resend responses must not show if an account exists for an email.
- Keep the auth email builders and the mail sender in server-only modules.
- Keep `GAME_SERVER_SECRET` and Socket Ticket signing in server-only modules. Issue a new ticket for each connection attempt and never cache the ticket response.
- Use an explicit Cross-Origin Resource Sharing origin outside local development.

ADR 0007 accepts Better Auth and short-lived Socket Tickets. The web application uses Better Auth for email and password sessions and issues Socket Tickets. The Game Server verifies those tickets.

## Environment Variables

`Apti-App/.env.example` contains the environment variable template.

| Variable | Runtime | Status | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_GAME_SERVER_URL` | Browser | Implemented | Selects the public Game Server URL. |
| `NEXT_PUBLIC_APP_URL` | Web | Reserved | Selects the canonical web URL. |
| `GAME_SERVER_PORT` | Game Server | Implemented | Selects the HTTP and WebSocket port. |
| `GAME_SERVER_ORIGIN` | Game Server | Implemented | Selects the allowed web origin. |
| `LOG_LEVEL` | Game Server | Implemented | Selects the Pino log level. |
| `DATABASE_URL` | Web, Game Server, and database tools | Implemented | Connects Prisma to PostgreSQL. |
| `GAME_SERVER_SECRET` | Web and Game Server | Implemented | Signs and verifies Socket Tickets and Room registrations. |
| `GAME_SERVER_INTERNAL_URL` | Web server only | Implemented, optional | Selects the Game Server URL for Room registration. The default is `NEXT_PUBLIC_GAME_SERVER_URL`. |
| `BETTER_AUTH_SECRET` | Web | Implemented | Signs Better Auth data. |
| `BETTER_AUTH_URL` | Web | Implemented | Selects the Better Auth URL. |
| `GOOGLE_CLIENT_ID` | Web | Implemented, optional | Identifies the Google OAuth client. |
| `GOOGLE_CLIENT_SECRET` | Web server only | Implemented, optional | Authenticates the Google OAuth client. Never sent to the browser. |
| `ADMIN_EMAILS` | Web | Implemented | Contains the Admin email allow-list. |
| `GMAIL_USER` | Web server only | Implemented | Identifies the Gmail account that sends auth email. Set it together with `GMAIL_APP_PASSWORD`. |
| `GMAIL_APP_PASSWORD` | Web server only | Implemented | Authenticates the Gmail SMTP connection. Never sent to the browser. |

Do not commit an `.env` file or a real secret.

The Google OAuth client for local development must list `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI. The general form is `${BETTER_AUTH_URL}/api/auth/callback/google`. The Dokploy Deployment PRD (#11) configures the production redirect URIs.

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

ADR 0008 accepts Dokploy as the deployment target. The user reports both services deployed, and both public HTTPS health endpoints responded on 2026-10-10. Other deployment acceptance checks remain open in issue #11.

The accepted target has these parts:

- `https://aptiquiz.codesuke.in` supplies the web application.
- `https://game.aptiquiz.codesuke.in` supplies the Game Server.
- Traefik terminates Transport Layer Security and proxies WebSocket connections.
- The web container applies Prisma migrations before start.
- The Game Server does not apply database migrations.
- The existing Dokploy PostgreSQL service stores persistent data.
- The available Redis service stays unused until measurements require it.

## Failure Rules

Failure rules for health, time-ping, handshake, email/password authentication, Admin access, and Socket Tickets are implemented. The other rules are requirements for future product slices.

- If a Socket Ticket is expired, the Game Server refuses the connection with `socket_ticket_expired`.
- If a Socket Ticket is altered, malformed, or for another audience, the Game Server refuses the connection with `socket_ticket_invalid`.
- If `GAME_SERVER_SECRET` is missing or shorter than 32 characters, the Game Server does not start.
- If a `time:ping` payload is invalid, the Game Server returns `invalid_time_ping`.
- If a User is suspended, Better Auth refuses a new session and rejects existing sessions on the next auth request. Server-rendered pages treat the session as inactive.
- If no session exists, `POST /api/socket-ticket` returns 401 and the browser connects as a Guest. If the User is suspended, it returns 403 and the browser does not silently connect as a Guest.
- If the ticket request fails for another reason, the browser sends an invalid handshake and shows the Game Server as offline.
- If an authenticated User lacks Admin access, `/admin` shows "Not allowed". A Guest is redirected to sign in.
- If an HTTP path is not available, the Game Server returns HTTP 404 and `not_found`.
- If an Answer is received after `endsAt`, the Game Server refuses it with `answer_too_late`.
- If an Answer is a duplicate, the Game Server refuses it with `already_answered`. A retry with the same key returns the first result, and the score is never added two times.
- If a socket disconnects, the browser resumes the Participant with the Resume Token and receives a full Room snapshot. A refused token returns the browser to the join form.
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
| A complete Match runs: timed Rounds, server-scored Answers, one-time close and reveal, Host advance, and finish. A 50-Participant Match is not load-tested. | PARTIALLY VERIFIED | `Apti-App/apps/game-server/src/{answers,reveal,advance}.test.ts`, `Apti-App/packages/game-engine/src/scoring.test.ts`, and a two-browser Match on 2026-10-10 | Prove 50-Participant capacity in #10. | #10 |
| A Host creates a Room, Guests and Users join a live Lobby of at most 50, and only the Host starts it one time. | VERIFIED | `Apti-App/apps/game-server/src/rooms.test.ts`, `Apti-App/packages/database/src/rooms.test.ts`, `Apti-App/apps/web/src/lib/rooms-handler.test.ts`, and a two-browser check on 2026-10-10 | Repeat the browser check when Room handling changes. | - |
| The Game Server identifies Users and Guests from Socket Tickets. | VERIFIED | `Apti-App/apps/game-server/src/handshake.ts`, `server.test.ts`, and `Apti-App/packages/socket-ticket/src/index.test.ts` | Keep the handshake tests successful. | - |
| Email/password sign-in and Socket Ticket issue are implemented; the Dokploy health endpoints respond; Redis and Kafka are unused. | PARTIALLY VERIFIED | Auth and handshake source; public HTTPS health responses checked 2026-10-10 | Finish the deployment checks in #11. | - |
| Google sign-in creates a User, links only to a verified User with the same email, and keeps `GOOGLE_CLIENT_SECRET` on the server. | VERIFIED | `Apti-App/apps/web/src/lib/google-sign-in.ts`, `google-sign-in.integration.test.ts`, and the production build output | Repeat the manual Google round trip when real credentials are available. | - |
| Email sign-up sends a verification email; `/verify-email` shows success only for a verified signed-in User and lets a User request a new link. | VERIFIED | `Apti-App/apps/web/src/lib/email-verification.ts`, `auth-emails.ts`, `app/(auth)/verify-email/page.tsx`, and their tests | Keep the resend endpoint rate-limited. | - |
| Password reset uses a one-time 60-minute link, does not show if an account exists, ends all sessions, and verifies the email. | VERIFIED | `Apti-App/apps/web/src/lib/auth.ts`, `password-reset.ts`, and `auth-password-reset.test.ts` | Repeat the Gmail delivery check when mail credentials change. | - |
| Admin access is derived from the verified email and current allow-list, and suspended Users lose access. | VERIFIED | `Apti-App/apps/web/src/lib/roles.ts`, `auth.ts`, `app/admin/page.tsx`, and their tests | Keep role and suspension checks at server request boundaries. | - |
| A signed-in browser requests a new ticket for each connection and shows the User identity from `server:ready`; a Guest browser shows Guest. | VERIFIED | `Apti-App/apps/web/src/components/game-server-status.tsx`, `lib/socket-auth.ts`, route and auth tests, and browser verification | Repeat the restart test when connection handling changes. | - |
