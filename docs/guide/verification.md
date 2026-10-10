# Deployment-guide verification

This record keeps the deployment instructions tied to the current repository. Recheck it when ports, commands, environment variables, or Dokploy configuration change.

| Claim | Verdict | Source |
| --- | --- | --- |
| The web app listens on port 3000 and has `GET /api/health`. | VERIFIED | `Apti-App/apps/web/package.json`; `Apti-App/apps/web/src/app/api/health/route.ts` |
| The Game Server defaults to port 3001 and has `GET /health`. | VERIFIED | `Apti-App/apps/game-server/src/config.ts`; `Apti-App/apps/game-server/src/server.ts` |
| The Game Server allows the origin from `GAME_SERVER_ORIGIN`. | VERIFIED | `Apti-App/apps/game-server/src/config.ts`; `Apti-App/apps/game-server/src/server.ts` |
| The Game Server rejects a missing or short `GAME_SERVER_SECRET`. | VERIFIED | `Apti-App/apps/game-server/src/config.ts` |
| Prisma reads `DATABASE_URL` and committed migrations live under `packages/database/prisma/migrations`. | VERIFIED | `Apti-App/packages/database/prisma7.config.ts`; `Apti-App/packages/database/prisma/migrations/` |
| The web Docker target can run production migrations before it starts; the Game Server target does not run migrations. | VERIFIED | `Apti-App/Dockerfile` |
| Public game-server and app URLs must be supplied while the web image builds. | VERIFIED | `Apti-App/Dockerfile`; `Apti-App/apps/web/src/components/game-server-status.tsx` |
| Dokploy supports Dockerfile build stages, environment variables, domains, and health-check rollbacks. | VERIFIED | [Dokploy build types](https://docs.dokploy.com/docs/core/applications/build-type); [variables](https://docs.dokploy.com/docs/core/variables); [domains](https://docs.dokploy.com/docs/core/domains); [production health checks](https://docs.dokploy.com/docs/core/applications/going-production) |
