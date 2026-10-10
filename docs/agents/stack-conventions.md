# AptiQuiz TypeScript Stack Conventions

Rules for Node.js 22+, TypeScript 5.9, Next.js 16, React 19, Socket.IO 4, Prisma ORM 7, pnpm 11, and Turborepo 2. Dependency patches are locked by `Apti-App/pnpm-lock.yaml`; re-check this document when changing a major version.

## Workspace

- Use pnpm only. Internal dependencies use `workspace:*`.
- The runnable workspace root is `Apti-App/`; run pnpm commands from that directory.
- Apps live under `Apti-App/apps/*`; reusable packages live under `Apti-App/packages/*`.
- Import through package exports. Never use relative paths that cross a package directory.
- Each package owns its dependencies, scripts, and TypeScript configuration.
- `Apti-App/package.json` scripts orchestrate package scripts through Turborepo.

## TypeScript

- Strict mode and `noUncheckedIndexedAccess` stay enabled.
- Use ESM and explicit `.js` extensions for relative imports compiled with `NodeNext`.
- Parse untrusted input at runtime; TypeScript types do not validate network data.
- Prefer discriminated unions and exhaustive switches for game states and commands.
- Avoid `any`, non-null assertions, boolean behavior flags, and type casts that bypass validation.

## Next.js Execution Model

- App Router pages and layouts are Server Components by default.
- Add `"use client"` only at the smallest interactive entry point.
- Keep secrets, database access, and token hashing in server-only modules.
- Use Route Handlers for public HTTP interfaces and Server Actions for form mutations when progressive enhancement is useful.
- Do not host Socket.IO or authoritative timers inside Next.js Route Handlers.
- Do not use browser time for answer acceptance or scoring.

## Realtime Game Server

- Socket handlers validate payloads, authorize the sender, call the game engine, and publish returned events.
- Socket handlers do not contain scoring formulas or phase-transition rules.
- Every mutating command is idempotent and receives a typed acknowledgement.
- Server time is authoritative; latency compensation must use server-observed measurements.
- Do not send correct-answer fields before the reveal event.
- Disconnect and reconnect are normal states, not exceptional crashes.

## Game Engine

- Keep the package framework-free, deterministic, and free of I/O.
- Accept time and dependencies as inputs; never call `Date.now()` inside game rules.
- Return the next state and domain events instead of performing network or database side effects.
- Test behavior through the exported interface.

## Data and Prisma

- `Apti-App/packages/database/prisma/schema.prisma` is the schema source of truth.
- Use Prisma ORM 7 commands with `Apti-App/packages/database/prisma7.config.ts`.
- Generate migrations through Prisma; do not manually create migration history.
- Generated Prisma client code is ignored and regenerated during install/build.
- Use database uniqueness constraints for idempotency where possible.
- Browser modules never import `@aptiquiz/database`.

## Styling and Components

- Tailwind CSS 4 provides utility styling.
- shadcn/ui primitives, when generated, live under `Apti-App/apps/web/src/components/ui` and may be edited as owned source.
- Shared product components remain in `Apti-App/apps/web` until a second application consumes them.
- Preserve keyboard access, visible focus, readable contrast, reduced-motion preferences, and mobile layouts.

## Verification

- `pnpm lint`: Biome formatting and lint rules.
- `pnpm typecheck`: strict type checks across the task graph.
- `pnpm test`: Vitest behavior tests.
- `pnpm build`: production builds for all apps and packages.
- `pnpm simulate`: socket connectivity/load proof against a running game server.

## Security

- Never commit `.env` files, tokens, database URLs, correct answers in pre-reveal payloads, or raw resume tokens.
- Hash host and resume tokens before persistence.
- Runtime-validate every HTTP, Socket.IO, environment, and database-bound input.
- Keep CORS origins explicit outside development.
- Treat Redis as private trusted infrastructure if it is added later.

## Version Watch

- Next.js major upgrades may change caching, request interfaces, and the Server/Client Component toolchain.
- Prisma 8 changes the client and CLI model; do not accept an automated major upgrade without a migration ADR.
- Socket.IO adapters do not automatically provide application-level participant recovery.
- Redis or Kafka adoption changes failure modes and operational ownership; each requires an accepted ADR before implementation.
