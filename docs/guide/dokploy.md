# Deploy AptiQuiz on Dokploy

This guide deploys two Dokploy applications from the `Apti-App/` workspace:

| Application | Docker build stage | Internal port | Public hostname |
| --- | --- | ---: | --- |
| Web | `web` | `3000` | `https://app.example.com` |
| Game Server | `game-server` | `3001` | `https://game.example.com` |

Replace `app.example.com` and `game.example.com` with your own hostnames consistently. The web hostname is the only origin accepted by the Game Server's CORS configuration.

## Before you start

- Install Dokploy on a server reachable on ports 80 and 443.
- Create or identify a PostgreSQL database that the Dokploy server can reach.
- Point DNS for both hostnames to the Dokploy server. Follow [the DNS guide](dns-and-nameservers.md).
- Push the `Dockerfile` and `.dockerignore` in `Apti-App/` to the branch Dokploy will deploy.

The Dockerfile runs with Node.js 22, builds all workspace packages, and has separate `web` and `game-server` targets. It installs the pinned pnpm version during the image build, so containers do not download Corepack packages during startup. It installs OpenSSL before Prisma's dependency lifecycle runs, so Prisma selects the container's OpenSSL 3 engine instead of falling back to an incompatible OpenSSL 1.1 assumption. It also caches lockfile package downloads independently of application source changes. It uses non-secret placeholder authentication settings only while compiling because Next.js loads route metadata at build time. Dokploy provides the real credentials only at runtime. The web target applies Prisma's committed migrations before it starts. The Game Server target never runs migrations.

## Prepare the database URL

Use the PostgreSQL host visible from the Docker network, not `localhost`. Its format is:

```text
postgresql://DATABASE_USER:DATABASE_PASSWORD@DATABASE_HOST:5432/DATABASE_NAME?schema=public
```

Percent-encode reserved characters in the username or password. For a Dokploy-managed PostgreSQL service, use its Docker-network hostname and credentials from that service's settings. Do not place this URL in Git or Docker build arguments.

## Create the web application

1. In Dokploy, create an **Application** from the repository and deployment branch.
2. Set **Build Type** to **Dockerfile**.
3. Set **Dockerfile Path** to `Dockerfile`, **Docker Context Path** to `.`, and **Docker Build Stage** to `web`. These paths are relative to the application build path; set that build path to `Apti-App` if Dokploy exposes the setting.
4. In the Dockerfile build arguments, set these public values. They must be build arguments because Next.js embeds `NEXT_PUBLIC_*` values into its browser bundle during `pnpm build`.

   ```text
   NEXT_PUBLIC_APP_URL=https://app.example.com
   NEXT_PUBLIC_GAME_SERVER_URL=https://game.example.com
   ```

   If these build arguments are missing, the Dockerfile falls back to `http://localhost:3001` for the Game Server. The web server then tries to register each new Room at `localhost` inside its own container, and **Create Room** fails with "The Game Server did not accept the Room" (HTTP 502). Because Next.js inlines `NEXT_PUBLIC_*` values at build time, a runtime environment variable with the same name does not fix this; rebuild with the build arguments instead.

5. Add these runtime environment variables in Dokploy's Environment tab:

   ```text
   DATABASE_URL=postgresql://DATABASE_USER:DATABASE_PASSWORD@DATABASE_HOST:5432/DATABASE_NAME?schema=public
   BETTER_AUTH_SECRET=replace-with-your-generated-32-plus-character-secret
   BETTER_AUTH_URL=https://app.example.com
   ADMIN_EMAILS=admin@example.com
   GAME_SERVER_SECRET=the-same-secret-as-the-game-server
   ```

   Optionally add `GAME_SERVER_INTERNAL_URL` (for example `http://game-server-service-name:3001`). The web server uses it, not the public URL, to register Rooms with the Game Server, and it is read at run time, so a restart applies it. When it is unset, the web server uses `NEXT_PUBLIC_GAME_SERVER_URL`. A failed registration is logged by the web service as `Game Server refused Room registration` or `Game Server Room registration failed`, with the URL and the reason.

   `BETTER_AUTH_SECRET` must be a stable secret that is at least 32 characters long. Generate one locally with `openssl rand -base64 32`; do not rotate it during a normal redeploy, because doing so invalidates existing authentication material. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` only when Google sign-in is configured.

6. In **Domains**, add `app.example.com`, select service port `3000`, and enable HTTPS. Dokploy configures Traefik for Dockerfile applications.
7. Deploy. The first start runs `prisma migrate deploy`; a failed database connection prevents the web process from starting, which protects the application from serving against an unmigrated database.

### Prepare Google SMTP credentials

The web workspace has a Gmail/Nodemailer sender that reads `GMAIL_USER` and `GMAIL_APP_PASSWORD`. **Better Auth verification and password-reset callbacks are not wired to that sender yet**, so setting these variables does not currently cause auth mail to be sent. Add them in Dokploy only when preparing that integration or after it is wired.

1. Create a dedicated Gmail or Google Workspace sender mailbox.
2. Enable [Google 2-Step Verification](https://support.google.com/mail/answer/185839) for that mailbox.
3. Create a dedicated [Google App Password](https://myaccount.google.com/apppasswords), for example `AptiQuiz SMTP`.
4. Add its values as **runtime environment variables** to the web application—never as Docker build arguments:

   ```text
   GMAIL_USER=aptiquiz.notifications@gmail.com
   GMAIL_APP_PASSWORD=your-16-character-google-app-password
   ```

Use the generated App Password, not the normal Google account password. Store it only in Dokploy's secret environment configuration; it is revoked if the Google account password changes. Google may hide App Passwords for some Workspace-managed or Advanced Protection accounts. See [Google's App Password documentation](https://support.google.com/accounts/answer/185833).

Set this health check in Dokploy's advanced or cluster settings if you enable health-check-based rollbacks:

```json
{
  "Test": ["CMD", "curl", "-f", "http://localhost:3000/api/health"],
  "Interval": 30000000000,
  "Timeout": 10000000000,
  "StartPeriod": 30000000000,
  "Retries": 3
}
```

## Create the Game Server application

Create a second Dokploy Application from the same repository and branch. Use the same paths as the web app, but set **Docker Build Stage** to `game-server`.

Add these runtime variables:

```text
GAME_SERVER_PORT=3001
GAME_SERVER_ORIGIN=https://app.example.com
GAME_SERVER_SECRET=replace-with-your-generated-32-plus-character-secret
LOG_LEVEL=info
```

`GAME_SERVER_SECRET` is required and must contain at least 32 characters. Use a newly generated secret for it, keep it out of the browser, and retain its value between routine deployments. When the future Socket Ticket issuer is enabled, it must use this same secret.

In **Domains**, add `game.example.com`, select service port `3001`, and enable HTTPS. Socket.IO uses this same HTTPS origin for its WebSocket upgrade; no separate port should be opened to the public internet.

If you enable health-check-based rollbacks, configure:

```json
{
  "Test": ["CMD", "curl", "-f", "http://localhost:3001/health"],
  "Interval": 30000000000,
  "Timeout": 10000000000,
  "StartPeriod": 15000000000,
  "Retries": 3
}
```

## Verify the deployment

After both deployments complete, run these from any machine with network access:

```bash
curl --fail https://app.example.com/api/health
curl --fail https://game.example.com/health
```

The first response identifies `aptiquiz-web`; the second contains `status: "ok"` and a server timestamp. Open the web app and confirm its connection indicator reaches the Game Server. If the browser cannot connect, first compare the built `NEXT_PUBLIC_GAME_SERVER_URL` with the Game Server domain and make sure `GAME_SERVER_ORIGIN` exactly matches the web origin, including `https://`.

## Operational notes

- Keep `DATABASE_URL`, Better Auth credentials, SMTP credentials, and server secrets in Dokploy environment variables. Docker build arguments are visible to the build and are not for secrets.
- This setup runs one Game Server process. Active Rooms are in memory and are lost if it restarts; Redis remains intentionally unused until the project adopts shared room state.
- Deploy the web service before the Game Server only if a web change requires a new schema migration. Routine Game Server deployments do not touch the database.
- Dokploy serves the public domains through Traefik. Expose ports `3000` and `3001` only inside the container platform; do not add host-port mappings for them.

Dokploy's current documentation covers [Dockerfile build stages](https://docs.dokploy.com/docs/core/applications/build-type), [application environment variables](https://docs.dokploy.com/docs/core/variables), [native domains](https://docs.dokploy.com/docs/core/domains), and [health-check rollbacks](https://docs.dokploy.com/docs/core/applications/going-production).
