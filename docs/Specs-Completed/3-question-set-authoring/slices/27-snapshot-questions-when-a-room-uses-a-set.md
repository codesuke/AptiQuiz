# Slice #27: Snapshot Questions when a Room uses a set

- Parent PRD: [#3](https://github.com/codesuke/AptiQuiz/issues/3) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/27
- Slice type: Horizontal
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met.

## Implementation summary

- `snapshotQuestionSet` reads the set and Questions in one RepeatableRead transaction and returns a deep-frozen `{ questionSetId, questions[] }` with text, options, correct answer, Topic, Difficulty, and optional media in order.
- Owned set or starter set only; another User's set, a Guest, and an unknown ID are rejected. Repeated calls each return a fresh copy.

## Verification evidence

- Vitest against the configured PostgreSQL: all fields and order retained; an earlier snapshot is unchanged after an edit and reorder while a new one reflects them; repeat snapshots equal; starter allowed; foreign/Guest/unknown refused; snapshot is frozen.

## Authorship

- Codesuke <codesuke@gmail.com>: `fdfde7f`. No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#27](https://github.com/codesuke/AptiQuiz/issues/27)
- State at archive time: CLOSED
- Labels: ready-for-agent

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/3

## Slice type

Horizontal

## What to build

Provide a server-side snapshot function that copies the selected Question Set's current Questions in order into immutable Room-ready data. PRD #4 will call this function at Room creation.

## Acceptance criteria

- [x] A signed-in Host can snapshot an owned Question Set or the shared starter set; a set owned by another User is rejected.
- [x] The snapshot retains ordered Question text, options, correct answer, Topic, Difficulty, image URL, and table data.
- [x] Editing or reordering the Question Set after a snapshot leaves prior snapshots unchanged; a new snapshot reflects the changes.
- [x] The same Question Set can be snapshotted repeatedly.

## Test seam

Snapshot service against the configured PostgreSQL test server.
