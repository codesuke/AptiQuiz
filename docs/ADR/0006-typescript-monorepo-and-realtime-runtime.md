# TypeScript Monorepo and Separate Realtime Runtime

AptiQuiz uses a pnpm/Turborepo TypeScript monorepo with a Next.js web application and a separate long-running Socket.IO game server. PostgreSQL stores durable records; live room state starts in one process, while Redis and Kafka are deferred until measurements justify them.

## Status

accepted

## Considered Options

- Put pages, CRUD, timers, and WebSockets into one custom Next.js server.
- Use Next.js for the web application and a separate Node.js Socket.IO process for authoritative gameplay (chosen).
- Start with independently deployed microservices, Redis, and Kafka.
- Use a managed realtime database as the game referee.

## Consequences

- Web and realtime workloads can be deployed and scaled independently.
- Shared TypeScript contracts prevent the two runtimes from drifting at compile time, while Zod validates untrusted runtime messages.
- A separate process adds one public origin and requires CORS configuration in local and deployed environments.
- A pure game-engine package keeps rules testable without sockets, React, or PostgreSQL.
- The initial one-process room implementation can be completed quickly, but active rooms do not survive a process restart.
- Redis becomes justified when the game server runs in more than one process.
- Kafka is not a prerequisite for application correctness and must not be introduced without measured workloads and an additional accepted ADR.
