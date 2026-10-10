# AptiQuiz

A live multiplayer aptitude arena where students answer synchronized questions under pressure and watch a server-scored leaderboard move in real time.

**Hackathon problem statement:** 3 — AptiQuiz.

## What It Does

A host creates a reusable aptitude Question Set, opens a Room, and shares a short Join Code. Up to 50 Participants answer the same timed Round from phones or laptops; the authoritative Game Server accepts answers, calculates speed-and-accuracy scores, reveals the answer, and broadcasts standings.

The complete official brief and team-authored build specification are in [`PS.md`](PS.md).

## Done / Left / Plan

### Done

- pnpm/Turborepo TypeScript workspace.
- Next.js web application with a game-server connectivity indicator.
- Long-running Socket.IO Game Server with health and typed time-ping interfaces.
- Shared Zod transport contracts.
- Pure, tested Game Engine phase transitions and provisional scoring.
- PostgreSQL/Prisma data model.
- Fifty-connection Socket.IO simulator.

### Left

- Question Set authoring and durable CRUD.
- Room creation, Join Code flow, lobby, and host controls.
- Full live Round events, answer acceptance, reveal, and Leaderboard.
- Stable option permutation, reconnect tokens, and cheating-resistance tests.
- Final analytics, College League, full 50-Participant match simulation, deployment, and demo recording.
- Better Auth accounts, signed Socket Tickets, Google OAuth, and email verification.

### Plan

1. Build one complete single-process match vertically.
2. Add reconnect and cheating-resistance behavior.
3. Persist completed matches and aggregate the College League.
4. Pass the full 50-Participant simulation and deploy.
5. Deploy both containers through Dokploy, then add Redis only when running multiple Game Server processes. Kafka remains deferred until durable multi-consumer event workloads are measured.

## Architecture and Why

The repository separates the web and realtime runtimes while sharing contracts and game rules:

```text
Apti-App/apps/web          Next.js product interface and durable CRUD
Apti-App/apps/game-server  authoritative Socket.IO runtime
Apti-App/apps/simulator    repeatable multi-participant proof

Apti-App/packages/contracts    runtime-validated events
Apti-App/packages/game-engine  deterministic transitions and scoring
Apti-App/packages/database     Prisma/PostgreSQL access
```

Next.js is not responsible for live timers or scoring. The standalone Game Server stays alive for WebSocket rooms, while the pure Game Engine keeps every rule independently testable. PostgreSQL owns durable authoring, accounts, results, and league records. Better Auth and signed Socket Tickets are accepted but not implemented. See [`Architecture.md`](Architecture.md), [ADR 0006](docs/ADR/0006-typescript-monorepo-and-realtime-runtime.md), [ADR 0007](docs/ADR/0007-better-auth-and-socket-tickets.md), and [ADR 0008](docs/ADR/0008-dokploy-deployment-redis-deferred.md).

## What We Added

- A framework-free state machine so UI and network code cannot silently invent game rules.
- Runtime-validated shared event contracts.
- A standalone simulator that defaults to 50 independent connections.
- An explicit application-first scale plan that avoids premature Redis and Kafka infrastructure.

## How to Run It

### Prerequisites

- Node.js 22.18 or newer; Node.js 24 is recommended.
- pnpm 11.
- PostgreSQL when running migrations or durable product features.

### Setup

```bash
cd Apti-App
cp .env.example .env
pnpm install
pnpm dev
```

Open:

- Web application: `http://localhost:3000`
- Web health: `http://localhost:3000/api/health`
- Game Server health: `http://localhost:3001/health`

No login is implemented yet.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

With `pnpm dev` running in another terminal:

```bash
pnpm simulate
```

The current simulator verifies concurrent WebSocket connections and typed time acknowledgements. It does not yet prove a complete 50-player match.

Bootstrap result on 10 October 2026: 50/50 local WebSocket clients connected successfully, with 18 ms median and 22 ms p95 time-ping round trip. Environment: WSL2, AMD Ryzen 7 5800H, 16 logical CPUs, 13 GiB RAM. This is connectivity evidence, not a complete-match capacity claim.

### Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

`pnpm db:migrate` and `pnpm db:studio` require a working `DATABASE_URL`.

## Tools and AI Used

- Next.js, React, TypeScript, Tailwind CSS, Socket.IO, Zod, Zustand, Prisma ORM, PostgreSQL, Vitest, Biome, pnpm, and Turborepo.
- OpenAI Codex assisted with architecture and bootstrap code.
- AptiQuiz currently has no end-user AI feature. If one is added, the interface will identify it clearly.

## Who It Is For

Students preparing for placement aptitude and logical-reasoning tests, and colleges that want repeatable live practice events and league competition. Students return for pressure practice, measurable topic improvement, and visible rank progression.

## Repository Workflow

Documentation and agent guidance stay at the repository root; all runnable source and workspace tooling live in [`Apti-App/`](Apti-App/). Read [`AGENTS.md`](AGENTS.md), [`CONTEXT.md`](CONTEXT.md), [`Architecture.md`](Architecture.md), and [`docs/agents/stack-conventions.md`](docs/agents/stack-conventions.md) before changing behavior. Planned work lives in GitHub Issues; verified completed behavior is recorded in [`docs/build-memory.yaml`](docs/build-memory.yaml).

## License

[MIT](LICENSE)
