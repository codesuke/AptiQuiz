<div align="center">
  <img src="https://raw.githubusercontent.com/codesuke/AptiQuiz/main/Apti-App/apps/web/public/brand/aptiquiz-logo-readme.png" alt="AptiQuiz" width="420">

  <h1>AptiQuiz</h1>
  <p><strong>Race the clock. Climb the room.</strong></p>
  <p>Live aptitude competition for students preparing for placements.</p>

  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-E65C00" alt="License: MIT"></a>
    <a href="Apti-App/package.json"><img src="https://img.shields.io/badge/Node.js-22.18%2B-339933" alt="Node.js 22.18 or newer"></a>
    <a href="Apti-App/package.json"><img src="https://img.shields.io/badge/pnpm-11-F69220" alt="pnpm 11"></a>
    <a href="#project-status"><img src="https://img.shields.io/badge/status-early_development-6B7280" alt="Status: early development"></a>
  </p>

  <p>
    <a href="#quick-start">Quick start</a> ·
    <a href="Architecture.md">Architecture</a> ·
    <a href="https://github.com/codesuke/AptiQuiz/issues">Roadmap &amp; issues</a> ·
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>

  <p>
    <a href="https://nextjs.org/"><img src="https://cdn.simpleicons.org/nextdotjs/111111" alt="Next.js" width="34" height="34"></a>
    <a href="https://react.dev/"><img src="https://cdn.simpleicons.org/react/61DAFB" alt="React" width="34" height="34"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://cdn.simpleicons.org/typescript/3178C6" alt="TypeScript" width="34" height="34"></a>
    <a href="https://tailwindcss.com/"><img src="https://cdn.simpleicons.org/tailwindcss/06B6D4" alt="Tailwind CSS" width="34" height="34"></a>
    <a href="https://socket.io/"><img src="https://cdn.simpleicons.org/socketdotio/010101" alt="Socket.IO" width="34" height="34"></a>
    <a href="https://www.postgresql.org/"><img src="https://cdn.simpleicons.org/postgresql/4169E1" alt="PostgreSQL" width="34" height="34"></a>
    <a href="https://www.prisma.io/"><img src="https://cdn.simpleicons.org/prisma/2D3748" alt="Prisma" width="34" height="34"></a>
    <a href="https://pnpm.io/"><img src="https://cdn.simpleicons.org/pnpm/F69220" alt="pnpm" width="34" height="34"></a>
  </p>
</div>

## About

AptiQuiz turns solitary placement practice into a live competition. The intended experience brings students into a shared Room to answer synchronized aptitude Questions, build accuracy under pressure, and follow their progress on a Leaderboard.

Hosts will create reusable Question Sets and share a Join Code. Participants will compete from phones or laptops, with the Game Server controlling deadlines, answer acceptance, and scoring. Completed results will contribute to College Leagues.

Built for **hackathon problem statement 3 — AptiQuiz**. See [the official brief and build specification](PS.md) for the full product scope.

## Project status

**The application is under active development.** Accounts are implemented and the web app and Game Server are deployed on Dokploy. Both public HTTPS health endpoints responded on 2026-10-10. A complete multiplayer match runs, and one 50-Participant Match passed on the deployed servers (see [50-Participant proof](#50-participant-proof)); consult [build memory](docs/build-memory.yaml) for verified feature delivery. The home page links to Question Set authoring and hosting setup, and labels Room creation and joining as upcoming.

| Area | Current state |
| --- | --- |
| Web application | Next.js home page, AptiQuiz branding, health endpoint, and connection details |
| Realtime server | Long-running Socket.IO server with health checks and validated time-ping acknowledgements |
| Game Engine | Tested initial phase transitions and provisional scoring rules |
| Shared contracts | Zod validation and TypeScript types for current interfaces |
| Database | PostgreSQL/Prisma schema and generated client; product persistence still planned |
| Match simulator | Plays a full 50-Participant Match through the public Socket.IO interface, locally and on the deployed servers |
| Gameplay | Question Set authoring, Room joining, live Rounds, reveal, Leaderboard, and saved results implemented |
| Accounts & leagues | Core account flows implemented; reconnection, completed results, and College League still planned |

The simulator proves one complete Room of 50 Participants, not capacity for many Rooms. Results are environment-specific; see [build memory](docs/build-memory.yaml) for verification history and limitations.

## Quick start

### Prerequisites

- Node.js **22.18+**; Node.js 24 is recommended by the project setup.
- pnpm **11**; the workspace pins `11.24.0`.
- PostgreSQL for account flows, database migrations, and database browsing.

### Install and run

```bash
git clone https://github.com/codesuke/AptiQuiz.git
cd AptiQuiz/Apti-App
cp .env.example .env
pnpm install
```

All workspace commands run from **`Apti-App/`**. Installation generates the Prisma client. Create your local PostgreSQL database, update `DATABASE_URL` in `.env`, and configure the authentication variables needed by account flows before starting the application. Then run:

```bash
pnpm db:migrate
pnpm dev
```

| Service | Local URL |
| --- | --- |
| Web application | http://localhost:3000 |
| Web health | http://localhost:3000/api/health |
| Game Server health | http://localhost:3001/health |

The [environment template](Apti-App/.env.example) documents server ports, browser URLs, and reserved authentication settings. The Game Server reads `Apti-App/.env` and refuses to start unless `GAME_SERVER_SECRET` contains at least 32 characters; generate one with `openssl rand -base64 32`.

Google sign-in is optional. To enable it, create an OAuth client of type "Web application" in the Google Cloud console, add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI, and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`. When either value is empty, the sign-in and sign-up pages show only the email form. Production redirect URIs are configured with the Dokploy deployment.

### Prepare Google SMTP for transactional email

The project includes a Gmail/Nodemailer sender configured through `GMAIL_USER` and `GMAIL_APP_PASSWORD`. **Email verification and password-reset callbacks have not yet been connected to Better Auth**, so these values do not send auth email by themselves today. Configure them now only when preparing a deployment or when wiring those callbacks.

1. Use a dedicated Gmail or Google Workspace sender mailbox.
2. Turn on [Google 2-Step Verification](https://support.google.com/mail/answer/185839).
3. Create an [App Password](https://myaccount.google.com/apppasswords) named `AptiQuiz SMTP` and copy the generated 16-character value.
4. Set the values in `Apti-App/.env`—never use the account's normal password or commit the file:

   ```env
   GMAIL_USER=aptiquiz.notifications@gmail.com
   GMAIL_APP_PASSWORD=your-16-character-google-app-password
   ```

Google may not offer App Passwords for Workspace accounts where an administrator disables them, accounts using Advanced Protection, or accounts configured only with security keys. Changing the Google account password revokes existing App Passwords; create and deploy a replacement when that happens. See [Google's App Password guidance](https://support.google.com/accounts/answer/185833).

### Verify the workspace

```bash
pnpm check
```

This runs formatting/lint checks, TypeScript checks, behavior tests, and production builds. Individual commands are also available:

| Command | Purpose |
| --- | --- |
| `pnpm lint` | Biome formatting and lint checks |
| `pnpm typecheck` | Strict TypeScript checks |
| `pnpm test` | Vitest behavior tests |
| `pnpm build` | Production builds for apps and packages |
| `pnpm simulate` | Plays a starter Room with up to 50 virtual Participants through every Question |

Run `pnpm simulate` in another terminal while `pnpm dev` is running.

The simulator needs a signed-in Host with a Home College. Pass that Host's session as a `Cookie` header value. Treat it as a secret: the simulator never prints it.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SIMULATOR_HOST_COOKIE` | none | Host session. The simulator creates a starter Room and a Host Socket Ticket through the web app. |
| `SIMULATOR_WEB_URL` | `http://localhost:3000` | Web application that creates the Room. |
| `SIMULATOR_URL` | `http://localhost:3001` | Game Server under test. |
| `SIMULATED_PLAYERS` | `50` | Participants to join, 1 to 50. A larger value fails before any connection. |
| `SIMULATOR_ROOM_ID`, `SIMULATOR_HOST_TICKET` | none | Alternative to the cookie: a fresh starter Room and a Host ticket made beforehand. Set both. A ticket lives 60 seconds. |

The report is JSON. `connectedSockets` counts open sockets and `joinedParticipants` counts accepted joins; `lobbyParticipants` is read back from the public Lobby. `latencyMs` metrics are client-observed acknowledgement round trips in milliseconds (`timePingAck`, `roomJoinAck`, `roomHostAck`) with sample counts, p50, p95, and max. The `match` block counts accepted Answers, deliberate new-key duplicates rejected, exact-key replays, late Answers rejected (by error code), Questions completed, payloads scanned for pre-reveal disclosure, and the Game Server timing constants. A late Answer sent at the deadline is rejected as `answer_too_late` or, when the deadline timer has already closed the Round, as `round_not_open`; both count as rejected. `hostCommandToRoundState` is the time from a Host start or advance command until each viewer receives the open Round. `lastAnswerAckToReveal` is the time from the last Answer acknowledgement to the reveal, for early-closed Rounds. A full run lasts about one Round duration, because the first Round stays open for the late Answer check.

The process exits nonzero when any setup, connection, join, Lobby, scoring, secrecy, or timeout check fails; `errors` names each broken check. During the second Question a subset of Participants disconnects and resumes with a Resume Token; `resumes` counts attempts and successes (same identity, score, Answer state, option order, and deadline). `leaderboardsConverged` counts Rounds whose ordered Leaderboard matched across the Host and every Participant and equalled the revealed Round points. `finalResultsVerified` counts saved results that match those totals. Resume Tokens are scrubbed from all output.

### 50-Participant proof

One full Match with 50 virtual Participants was run against the deployed servers on **2026-10-10 at 14:52 UTC**. The simulator process exited 0 and its report showed no errors.

Command (the Host session is a secret and is not recorded here):

```bash
cd Apti-App
SIMULATOR_WEB_URL=https://aptiquiz.codesuke.in \
SIMULATOR_URL=https://game.aptiquiz.codesuke.in \
SIMULATOR_HOST_COOKIE='<Cookie header of a signed-in Host with a Home College>' \
pnpm simulate
```

| Item | Value |
| --- | --- |
| Runner | AMD Ryzen 7 5800H, 16 logical CPUs, 13 GiB RAM, WSL2 (Linux 6.18), Node.js 24.14; reached the servers over the public internet |
| Game Server and web app | Dokploy deployment at `game.aptiquiz.codesuke.in` and `aptiquiz.codesuke.in`. The server hardware is not visible to the runner and is not recorded. |
| Simulator code | commit `7298213` |
| Question Set | Seeded starter set, 3 Questions |
| Round timing | 30,000 ms Round; 100 ms delay-compensation cap; 100 ms score bucket |
| Host | A throwaway account made for this run |

Counts from the report: 50 sockets connected, 50 Participants joined, 50 distinct identities in the public Lobby; 3 Questions completed; 140 Answers accepted (30 of them wrong); 10 unanswered Participant-Rounds; 30 new-key duplicates rejected; 30 exact-key replays returned the first result; 10 late Answers rejected, all as `round_not_open` (the deadline timer had already closed the Round); 15 of 15 resumes restored identity, score, Answer state, option order, and deadline; Leaderboards were identical for all viewers after 3 of 3 Rounds; 50 saved results matched the revealed Round points; 2,056 pre-reveal payloads were scanned and none disclosed a correct option, correctness, explanation, or points. The run took about 32 s.

Client-observed latency in milliseconds (the time from sending a command to its acknowledgement or event, measured in the simulator process, including the internet round trip):

| Metric | Samples | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| `timePingAck` | 50 | 34.8 | 55.9 | 57.5 |
| `roomJoinAck` | 50 | 122.0 | 162.6 | 168.9 |
| `roundAnswerAck` | 210 | 31.3 | 37.6 | 43.8 |
| `roomResumeAck` | 15 | 29.4 | 34.5 | 34.5 |
| `hostCommandToRoundState` | 153 | 38.2 | 44.1 | 51.6 |
| `lastAnswerAckToReveal` | 102 | 41.9 | 67.4 | 76.9 |
| `roomAdvanceAck` | 3 | 28.9 | 100.6 | 100.6 |

This is one run of one Room. It shows that a 50-Participant Match completes correctly on the deployed Game Server from a single runner. It does not show capacity for many Rooms, other networks, or browsers. The simulator sets no latency pass threshold.

### Database commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Migrations and Prisma Studio need a reachable PostgreSQL database and a valid `DATABASE_URL`. The schema lives in [packages/database](Apti-App/packages/database/prisma/schema.prisma).

## Architecture

The web interface and realtime runtime share validated contracts and deterministic game rules. A separate Game Server owns timing; the browser is not authoritative for answers or scores.

```mermaid
flowchart LR
    Browser[Browser] -->|HTTP| Web[Next.js web app]
    Browser <-->|WebSocket| Server[Socket.IO Game Server]
    Web -.-> Contracts[Shared contracts]
    Server -.-> Contracts
    Server -. planned gameplay .-> Engine[Pure Game Engine]
    Web -. planned persistence .-> Database[(PostgreSQL / Prisma)]
```

Solid arrows show current browser interfaces. Dashed arrows show shared dependencies or planned integration, as labeled. The Game Engine and database schema exist; complete gameplay and persistence flows remain to be wired.

```text
AptiQuiz/
├── Apti-App/                 # Runnable pnpm / Turborepo workspace
│   ├── apps/
│   │   ├── web/              # Next.js interface and public brand assets
│   │   ├── game-server/      # Authoritative Socket.IO runtime
│   │   └── simulator/        # Repeatable connection verification
│   └── packages/
│       ├── contracts/        # Runtime schemas and transport types
│       ├── game-engine/      # Pure phase transitions and scoring
│       ├── database/         # Prisma schema and PostgreSQL adapter
│       └── typescript-config/
├── design-mocks/             # UI references, prototypes, and logo provenance
├── docs/                     # Architecture decisions and build records
└── AGENTS.md                 # Agent contribution rules
```

Read [Architecture.md](Architecture.md) for implemented interfaces, failure behavior, and deployment plans. Redis remains deferred until measurements justify multiple Game Server processes; Kafka is also deferred.

## Scoring and timing

The Game Server is the only clock that decides an Answer. Players see these rules in the Lobby before the match starts.

- **Round length.** Each Question stays open for 30 s from its server start time.
- **Points.** A correct Answer earns `500 + floor(500 × (1 − Effective Response Time / duration))`, so 500 to 1000 points; faster earns more. A wrong or missing Answer earns 0. Only the first accepted Answer counts.
- **Network delay.** The Game Server pings each connection and keeps a rolling median of the measured round-trip times. For scoring, it subtracts `min(median RTT / 2, 100 ms)` from the elapsed time, or 0 when there is no valid sample yet.
- **Buckets.** The Effective Response Time is rounded down to 100 ms steps before the formula, so tiny timing differences do not change the score.
- **Deadline.** There is no grace period. An Answer that the server receives after the deadline is rejected; delay compensation only affects the score of an on-time Answer and never makes a late Answer valid.

The values are configured in [`Apti-App/apps/game-server/src/config.ts`](Apti-App/apps/game-server/src/config.ts) and sent to the browser with the Lobby, so the shown rules always match the server.

## Tech stack

<div align="center">
  <a href="https://nextjs.org/"><img src="https://cdn.simpleicons.org/nextdotjs/111111" alt="Next.js" width="52" height="52"></a>
  <a href="https://react.dev/"><img src="https://cdn.simpleicons.org/react/61DAFB" alt="React" width="52" height="52"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://cdn.simpleicons.org/typescript/3178C6" alt="TypeScript" width="52" height="52"></a>
  <a href="https://tailwindcss.com/"><img src="https://cdn.simpleicons.org/tailwindcss/06B6D4" alt="Tailwind CSS" width="52" height="52"></a>
  <a href="https://nodejs.org/"><img src="https://cdn.simpleicons.org/nodedotjs/5FA04E" alt="Node.js" width="52" height="52"></a>
  <a href="https://socket.io/"><img src="https://cdn.simpleicons.org/socketdotio/010101" alt="Socket.IO" width="52" height="52"></a>
  <a href="https://www.postgresql.org/"><img src="https://cdn.simpleicons.org/postgresql/4169E1" alt="PostgreSQL" width="52" height="52"></a>
  <a href="https://www.prisma.io/"><img src="https://cdn.simpleicons.org/prisma/2D3748" alt="Prisma" width="52" height="52"></a>
  <a href="https://pnpm.io/"><img src="https://cdn.simpleicons.org/pnpm/F69220" alt="pnpm" width="52" height="52"></a>
  <a href="https://turbo.build/"><img src="https://cdn.simpleicons.org/turborepo/EF4444" alt="Turborepo" width="52" height="52"></a>
  <a href="https://biomejs.dev/"><img src="https://cdn.simpleicons.org/biome/60A5FA" alt="Biome" width="52" height="52"></a>
  <a href="https://vitest.dev/"><img src="https://cdn.simpleicons.org/vitest/6E9F18" alt="Vitest" width="52" height="52"></a>
</div>

<p align="center"><sub>Next.js · React · TypeScript · Tailwind CSS · Node.js · Socket.IO · PostgreSQL · Prisma · pnpm · Turborepo · Biome · Vitest</sub></p>

| Arena | Stack |
| --- | --- |
| Player experience | Next.js 16, React 19, Tailwind CSS 4 |
| Live competition | Node.js, Socket.IO 4, authoritative Game Server |
| Shared rules | TypeScript, Zod, pure Game Engine |
| Persistence | PostgreSQL, Prisma ORM 7 |
| Monorepo & quality | pnpm 11, Turborepo, Biome, Vitest |

Better Auth integration and the Dokploy deployment are present; remaining deployment acceptance checks are tracked in [issue #11](https://github.com/codesuke/AptiQuiz/issues/11). Exact dependency versions are recorded in [the workspace](Apti-App/package.json) and [lockfile](Apti-App/pnpm-lock.yaml).

## Roadmap

The active roadmap and acceptance criteria live in [GitHub Issues](https://github.com/codesuke/AptiQuiz/issues).

1. Build minimal College selection and Question Set authoring, including optional image and table content.
2. Complete the Room, live Round, Guest entry, and Participant reconnection flows.
3. Show Leaderboard movement and final results, then aggregate one weekly College League.
4. Verify a complete 50-Participant match against the existing deployment and document the evidence.

## Documentation

| Resource | Contents |
| --- | --- |
| [Product brief](PS.md) | Official problem statement and product scope |
| [Domain glossary](CONTEXT.md) | Question Sets, Rooms, Rounds, and other shared terms |
| [Architecture](Architecture.md) | System structure, implemented behavior, and accepted plans |
| [Architecture decisions](docs/ADR/README.md) | Recorded technical trade-offs |
| [Brand](Brand.md) · [Design system](DESIGN.md) | Logo usage, voice, and the home-page-led visual standard |
| [Design references](design-mocks/README.md) | Canonical home page, other screen references, and asset provenance |
| [Deployment guides](docs/guide/README.md) | Dokploy deployment, DNS records, and nameserver delegation |
| [Build memory](docs/build-memory.yaml) | Verified changes, evidence, and known limitations |

## Contributing

Bug reports, documentation improvements, and focused contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, verification, and the GitHub-first delivery workflow. AI agents should also follow [AGENTS.md](AGENTS.md).

Open an [issue](https://github.com/codesuke/AptiQuiz/issues) to discuss a feature or report a reproducible bug. Keep contributions small and name the observable behavior they change.

## Acknowledgements

OpenAI Codex assisted with architecture, bootstrap code, and documentation. The AptiQuiz logo was generated with the built-in imagegen tool; its [original prompt and asset](design-mocks/aptiquiz-logo/README.md) are preserved. The current product has no end-user AI feature.

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 Codesuke.
