# Dokploy Deployment with Redis Provisioned but Deferred

AptiQuiz deploys both runtimes as containers on a self-hosted Dokploy instance: `Apti-App/apps/web` at `aptiquiz.codesuke.in` and one long-running `Apti-App/apps/game-server` at `game.aptiquiz.codesuke.in`, using the PostgreSQL service already running on Dokploy. A Redis service is also provisioned but stays unused until a second Game Server process is justified by measurement.

## Status

accepted

## Considered Options

- Vercel for the web app, Railway for the Game Server, Neon for PostgreSQL.
- Dokploy for everything on infrastructure the team already runs (chosen).
- One domain with path-based routing of `/socket.io` to the Game Server.

## Consequences

- Traefik in Dokploy terminates TLS and proxies WebSockets; the Game Server keeps an explicit CORS allow-list of `https://aptiquiz.codesuke.in`.
- Two subdomains avoid fragile path routing at the cost of cross-origin configuration.
- The web container runs `prisma migrate deploy` before starting; the Game Server never runs migrations.
- The 50-player simulation runs against the deployed Game Server, and the README records VPS specifications, configuration, date, and result.
- Live Rooms are lost on a Game Server restart until Redis-backed room state exists. Using the provisioned Redis for any purpose requires a further accepted ADR.
