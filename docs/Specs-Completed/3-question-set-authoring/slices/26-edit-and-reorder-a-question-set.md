# Slice #26: Edit and reorder a Question Set

- Parent PRD: [#3](https://github.com/codesuke/AptiQuiz/issues/3) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/26
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met.

## Implementation summary

- `updateQuestion` replaces a Question's fields (clearing media when omitted); `reorderQuestions` applies a full permutation of the set's Questions in one transaction, parking positions below zero to respect the unique key.
- `requireEditableSet` allows only the owner of a non-starter set and locks the set row, so concurrent add, edit, and reorder cannot collide.
- Web: Edit page, move up/down buttons, and error messages for refused changes.

## Verification evidence

- Vitest against the configured PostgreSQL: edit read back, media cleared, reorder read back, invalid edit/reorder (missing, duplicate, foreign, empty, extra IDs) leaves the set unchanged, other User/Guest/foreign Question/starter refused, concurrent adds and reorder keep positions contiguous. Biome, typecheck, and build pass.

## Authorship

- Codesuke <codesuke@gmail.com>: `534e625`, review fixes `6e182c7`. No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#26](https://github.com/codesuke/AptiQuiz/issues/26)
- State at archive time: CLOSED
- Labels: ready-for-agent

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/3

## Slice type

Vertical

## What to build

A Host can revise their Question Set and change the order of its Questions for its next use.

## Acceptance criteria

- [x] A Host can edit Questions and see the saved changes when reopening the set.
- [x] A Host can reorder Questions and read them back in the chosen order.
- [x] Invalid edits or reorder requests are rejected without partially changing the set; another User cannot edit or reorder it.

## Test seam

Authoring service against the configured PostgreSQL test server.
