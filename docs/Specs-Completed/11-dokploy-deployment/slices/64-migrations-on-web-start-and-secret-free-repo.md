# Slice #64: Prove migrations on web start and a secret-free repository

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/64
- Slice type: Horizontal
- Parent PRD: [#11](https://github.com/codesuke/AptiQuiz/issues/11)
- Acceptance criteria: all met (see below).

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/11

## Slice type

Horizontal

## What to build

Evidence that a new schema migration applies when the web container starts, that the Game Server never migrates, and that no secret value is in the repository.

## Acceptance criteria

- [x] Logs from a deployment, or a container run against a scratch database, show a new migration applied at web container start.
- [x] The Game Server container does not run migrations.
- [x] A secret scan of tracked files and git history finds no secret value.

## Test seam

Container start log and secret-scan run.

## Implementation summary

The exact web-image migration step (prisma migrate deploy) applied all 8 migrations to an empty scratch schema, later dropped. Only the web Dockerfile target migrates. Scans of tracked files and history found only placeholders.

## Verification evidence

Evidence comment on issue #64. Docker was unavailable, so the container itself and Dokploy logs were not inspected.

## Authorship

Codesuke <codesuke@gmail.com> is the repository author. Probes and docs were produced with an AI agent under the user's direction.

## Addendum: deploy evidence

The deploy of commit `3068edd` ran the web container with 9 migrations. Its log on 2026-10-10 15:22:03 UTC shows `Applying migration 20261010152001_match_result_completed_at_index` and `All migrations have been successfully applied`, followed by `next start`. The production `_prisma_migrations` row and the index `MatchResult_completedAt_idx` agree.
