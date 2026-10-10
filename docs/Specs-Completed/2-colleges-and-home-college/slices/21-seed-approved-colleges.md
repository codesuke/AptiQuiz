# Slice #21: Seed approved Colleges

- Parent PRD: [#2](https://github.com/codesuke/AptiQuiz/issues/2) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/21
- Slice type: Horizontal
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met, according to the closing comment and the verification below.

## Implementation summary

- `@aptiquiz/database` exports `APPROVED_COLLEGES` (70 Colleges), `normalizeCollegeName`, `collegeIdFor` (`college_<slug>`), and `seedColleges`.
- The seed is one SQL upsert on the unique normalized name; a second run changes no rows or IDs.
- `pnpm --filter @aptiquiz/database db:seed` runs it. No migration was needed; the College table is in the initial migration.

## Verification evidence

- Vitest (5 tests) runs the seed twice against the configured PostgreSQL: no duplicates, stable IDs, spelling variants normalize to one value.
- `db:seed` exits 0; biome check and database typecheck pass.

## Authorship

- Commit `1429ab1` on `main` by Codesuke <codesuke@gmail.com>. No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#21](https://github.com/codesuke/AptiQuiz/issues/21)
- State at archive time: CLOSED
- Labels: ready-for-agent

## Parent

#2

## Slice type

Horizontal

## What to build

An idempotent seed loads the approved College list into PostgreSQL. Each College has a stable ID and a unique normalized name, so running the seed again never creates duplicates. If the College table is not yet covered by the migration history, include the Prisma-generated migration for it.

## Acceptance criteria

- [ ] The seed loads the approved Colleges with stable IDs and unique normalized names.
- [ ] Running the seed a second time leaves the same set of Colleges and creates no duplicates.
- [ ] Names that differ only in case, spacing, or punctuation normalize to one College.
- [ ] A behavior test runs the seed twice against the configured PostgreSQL test server and checks the result.

## Blocked by

Set as a native blocking edge: none (can start immediately).
