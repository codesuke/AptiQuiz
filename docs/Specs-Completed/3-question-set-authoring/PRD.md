# PRD #3: Question Set Authoring

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/3
- Archived: 2026-10-10
- Status: all slices implemented, verified, and closed. The PRD issue was closed with the archive.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#24](https://github.com/codesuke/AptiQuiz/issues/24) | Create Question Sets with text Questions | Vertical | [slice](slices/24-create-question-sets-with-text-questions.md) |
| [#25](https://github.com/codesuke/AptiQuiz/issues/25) | Add image and table Questions and a starter set | Vertical | [slice](slices/25-add-image-and-table-questions-and-a-starter-set.md) |
| [#26](https://github.com/codesuke/AptiQuiz/issues/26) | Edit and reorder a Question Set | Vertical | [slice](slices/26-edit-and-reorder-a-question-set.md) |
| [#27](https://github.com/codesuke/AptiQuiz/issues/27) | Snapshot Questions when a Room uses a set | Horizontal | [slice](slices/27-snapshot-questions-when-a-room-uses-a-set.md) |

## Build summary

- A signed-in Host creates a Question Set with text, image-URL, and table Questions (2 to 6 options, one correct option, Topic, Difficulty), validated on the server.
- A Host edits a Question and reorders the set; both are all-or-nothing and refused for another User, a Guest, and the starter set. Writes to one set are serialised by a row lock.
- `snapshotQuestionSet(db, hostId, setId)` returns a deep-frozen, ordered copy of the set's Questions (text, options, correct answer, Topic, Difficulty, optional media). It works on an owned set or the starter set and can be called repeatedly.
- One ownerless, flagged starter set is seeded idempotently and is visible and hostable by every signed-in User, but read-only.
- Web pages: `/question-sets`, `/question-sets/[setId]` (move up/down, Edit), and `/question-sets/[setId]/questions/[questionId]`.

## Hand-offs to later PRDs

- PRD #4 calls `snapshotQuestionSet` at Room creation and persists the result with the Room; the snapshot is an in-memory frozen value until then.
- Proving that a live Room ignores later edits is verified in #4.

## Verification summary

- Slice evidence is in each slice file. Final run: database 19/19 against the configured PostgreSQL, web 66, game-server 13, contracts 2; typecheck, biome, and production build pass.
- `code-review` (Standards and Spec) findings fixed in `6e182c7`: concurrent add/reorder race (set row lock), unhandled service errors in actions (now shown as an error message), duplicated error redirect and timestamp code, magic numbers, and the `swapped` name.
- Left unchanged on purpose: no idempotency key on edit and reorder (replay gives the same end state); `snapshotQuestionSet` has no caller until #4; renaming a set title is not in any slice; no browser run of the edit and reorder pages.

## Authorship

Derived from commit authors on `main`. No commit carries a `Co-authored-by` trailer.

- OpenAI Codex <codex@openai.com> (agent): `fd3f0a4`, `77b1e8d`, `659c2ed` (#24); `f1ef680`, `151b6fa`, `01c286a` (#25).
- Codesuke <codesuke@gmail.com>: `534e625` (#26), `fdfde7f` (#27), `6e182c7` (review fixes).

## Issue snapshot

- Issue: [#3](https://github.com/codesuke/AptiQuiz/issues/3)
- Labels: ready-for-agent

## Problem statement

A Host needs reusable aptitude Questions before a Room can run.

## Outcome

A signed-in Host can create, edit, reorder, and reuse a Question Set for multiple Rooms.

## User stories

1. As a Host, I want to build and revise a Question Set so I can run it repeatedly.

## Requirements

- A Question has text, 2–6 options, one correct option, Topic, and Difficulty.
- A Question can include an image URL or a table; both are optional.
- A Host can create and edit Questions, reorder them, and select an existing Question Set for a new Room.
- Validate authoring inputs on the server.
- Provide a snapshot function that copies a Question Set's current Questions, in order, into an immutable form a Room can keep. #4 calls it at Room creation so later edits do not change a live match.
- Seed one small starter Question Set for a fast demo. It is flagged as a starter set and has no owning User. Every signed-in User can see it and host a Room from it; no User can edit, reorder, or delete it. Re-running the seed does not duplicate it.

## Acceptance criteria

- [x] A Host creates a Question Set containing a text Question, a Question with an image URL, and a Question with a table.
- [x] A snapshot taken before an edit or reorder is unchanged afterward; a snapshot taken after reflects the edit.
- [x] The same Question Set can be snapshotted any number of times (reuse).
- [x] Invalid options, missing correct answer, Topic, or Difficulty are rejected.
- [x] Every signed-in User sees the starter set in their list of sets available for a Room; an attempt to edit it is refused.
- [x] Re-running the seed leaves exactly one starter set.

## Implementation decisions

- Decision: add a starter flag to Question Set and make its owner optional; a starter set has no owner.
  - Rationale: the quickest path to a demo with no per-User copying. Ownership checks become "owned by this User or a starter set" for hosting, and "owned by this User" for editing.

## Testing decisions

- Highest useful public test seam: authoring service and Room snapshot against the configured PostgreSQL test server.
- Verify CRUD, order, media data, validation, snapshot stability, starter-set visibility and read-only rule, and seed idempotency.
- Creating a Room from the set and proving a live Room is unaffected by edits is verified in #4.

## Dependencies

- #1 Accounts, Roles & Sign-in.

## Out of scope

- Featured set management, duplicate-set action, import, upload, explanation authoring, per-Question timing, and advanced preview.
