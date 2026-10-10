# Slice #24: Create Question Sets with text Questions

- Parent PRD: [#3](https://github.com/codesuke/AptiQuiz/issues/3) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/24
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met.

## Implementation summary

- `createQuestionSet` and `listQuestionSets` create and read owned, ordered text Question Sets; `questionInputSchema` enforces 2 to 6 options, a valid correct option, Topic, and Difficulty.
- Creation is idempotent per Host (`idempotencyKey`); Guests and other Users cannot create, read, or change the set.

## Verification evidence

- Vitest against the configured PostgreSQL: create/read order, invalid inputs rejected with nothing written, Guest refused, other User sees nothing.

## Authorship

- OpenAI Codex <codex@openai.com> (agent): `fd3f0a4`, `77b1e8d`, `659c2ed`. No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#24](https://github.com/codesuke/AptiQuiz/issues/24)
- State at archive time: CLOSED
- Labels: ready-for-agent

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/3

## Slice type

Vertical

## What to build

A signed-in Host can create and list their own reusable Question Sets with ordered text Questions.

## Acceptance criteria

- [x] A signed-in Host can create a Question Set with at least one text Question and read the saved Questions in order.
- [x] The authoring service rejects a Question with fewer than two or more than six options, no valid correct option, missing Topic, or missing Difficulty.
- [x] An unauthenticated person cannot create a Question Set, and another User cannot read or change the Host's set.

## Test seam

Authoring service against the configured PostgreSQL test server.
