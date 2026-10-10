# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_HOME="$PNPM_HOME/corepack"
ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBO_TELEMETRY_DISABLED=1

RUN corepack enable && \
    corepack install --global pnpm@11.24.0 && \
    apt-get update && \
    apt-get install --yes --no-install-recommends ca-certificates curl openssl && \
    rm -rf /var/lib/apt/lists/*

FROM base AS build

WORKDIR /app

# Keep package downloads cached when application source files change. `pnpm fetch`
# uses the lockfile, while the subsequent offline install still runs lifecycle
# scripts after the full workspace (including Prisma's schema) is available.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=aptiquiz-pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm fetch --frozen-lockfile

COPY . .

RUN --mount=type=cache,id=aptiquiz-pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --offline --frozen-lockfile

# Next.js embeds NEXT_PUBLIC_* values into the browser bundle at build time.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_GAME_SERVER_URL=http://localhost:3001

ENV NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL"
ENV NEXT_PUBLIC_GAME_SERVER_URL="$NEXT_PUBLIC_GAME_SERVER_URL"
# Next.js imports the authentication module while collecting route metadata.
# These are deliberately non-secret, build-only placeholders; Dokploy supplies
# the real values when the web container runs.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/aptiquiz?schema=public"
ENV BETTER_AUTH_URL="$NEXT_PUBLIC_APP_URL"
ENV BETTER_AUTH_SECRET="build-only-secret-not-for-production-1234567890"

RUN pnpm build

FROM base AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

RUN groupadd --system aptiquiz && \
    useradd --system --gid aptiquiz --create-home aptiquiz && \
    chown --recursive aptiquiz:aptiquiz "$COREPACK_HOME"

COPY --from=build --chown=aptiquiz:aptiquiz /app /app

USER aptiquiz

FROM runtime AS web

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl --fail http://127.0.0.1:3000/api/health || exit 1

# Production migrations run before the web process starts. The Game Server
# target deliberately does not migrate the database.
CMD ["sh", "-c", "pnpm --filter @aptiquiz/database exec prisma migrate deploy --config prisma7.config.ts && exec pnpm --filter @aptiquiz/web start"]

FROM runtime AS game-server

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl --fail http://127.0.0.1:3001/health || exit 1

CMD ["pnpm", "--filter", "@aptiquiz/game-server", "start"]
