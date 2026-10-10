# Slice #25: Add image and table Questions and a starter set

- Parent PRD: [#3](https://github.com/codesuke/AptiQuiz/issues/3) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/25
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met (all four boxes were checked on the issue).

## Implementation summary

- `addQuestion` appends Questions with optional image URL (HTTP/HTTPS only) or table media; malformed media is rejected and leaves the set unchanged.
- `seedStarterQuestionSet` upserts one ownerless starter set (`isStarter`); every signed-in User lists and reads it; edits are refused.

## Verification evidence

- Vitest against the configured PostgreSQL: mixed set, malformed media, seed run twice leaves one starter set, starter edit refused.

## Authorship

- OpenAI Codex <codex@openai.com> (agent): `f1ef680`, `151b6fa`, `01c286a`. No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#25](https://github.com/codesuke/AptiQuiz/issues/25)
- State at archive time: CLOSED
- Labels: ready-for-agent

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/3

## Slice type

Vertical

## What to build

A Host can add Questions with an optional image URL or table. Seed one small, ownerless starter Question Set for every signed-in User to use when hosting.

## Acceptance criteria

- [x] A Host can save and read a Question with an image URL and a Question with a table alongside a text Question in one Question Set.
- [x] Server validation rejects malformed image and table inputs while preserving valid optional media.
- [x] A small starter Question Set can be seeded repeatedly without duplicates. It has no owner, is flagged as a starter, and appears in every signed-in User's available sets.
- [x] The starter set is read-only for authoring.

## Test seam

Authoring service and seed operation against the configured PostgreSQL test server.
