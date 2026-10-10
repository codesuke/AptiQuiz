# 12. Run and Check the Code

## What you need

- Node.js 22.18 or newer. Node.js 24 is recommended.
- pnpm 11.
- A PostgreSQL database.

## Install

1. Get the code:

   ```bash
   git clone https://github.com/codesuke/AptiQuiz.git
   cd AptiQuiz/Apti-App
   ```

2. Copy the settings file:

   ```bash
   cp .env.example .env
   ```

3. Open `.env`. Set `DATABASE_URL` to your PostgreSQL database.
4. Make a secret of at least 32 characters and set it as `GAME_SERVER_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

5. Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.
6. Install the libraries:

   ```bash
   pnpm install
   ```

7. Make the database tables:

   ```bash
   pnpm db:migrate
   ```

8. Load the colleges and the starter Question Sets:

   ```bash
   pnpm --filter @aptiquiz/database db:seed
   ```

> **Caution:** Do not commit the `.env` file. It contains secrets.

Google sign-in and Gmail are optional. The [project README](../../README.md#quick-start) tells you how to set them.

## Start

```bash
pnpm dev
```

| Service | Address |
|---|---|
| Web application | http://localhost:3000 |
| Game Server health | http://localhost:3001/health |

## Check

Run all checks with one command:

```bash
pnpm check
```

This command runs these checks:

| Command | It checks |
|---|---|
| `pnpm lint` | The code style. |
| `pnpm typecheck` | The TypeScript types. |
| `pnpm test` | The behaviour tests. |
| `pnpm build` | The production build. |

## Run the 50-player test

See [The 50-player test](09-fifty-player-test.md).

## Settings of the Game Server

Most values are in `Apti-App/apps/game-server/src/config.ts`. The ready and reveal times are in `Apti-App/apps/game-server/src/rooms.ts`.

| Setting | Value |
|---|---|
| Question time | 30 seconds |
| Ready time before each Question | 3 seconds |
| Reveal time after each Question | 6 seconds |
| Largest delay correction | 100 ms |
| Score step | 100 ms |
| Ping interval and window | Every 2 seconds, last 5 replies |
| Reconnect grace | 5 seconds |
| Event limit for each connection | 30 at once, 10 each second after that |
| Players in one Room | 50 at most |
