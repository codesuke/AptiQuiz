# Slice #66: Document the deployed setup in the README

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/66
- Slice type: Horizontal
- Parent PRD: [#11](https://github.com/codesuke/AptiQuiz/issues/11)
- Acceptance criteria: all met (see below).

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/11

## Slice type

Horizontal

## What to build

README and Architecture.md describe the verified deployed setup.

## Acceptance criteria

- [x] README covers service domains, deployment, migration, seed, configuration variable names, and the 50-Participant result.
- [x] Architecture.md deployment status and claims ledger match the verified evidence.

## Test seam

Commit `8496c5a` changes `README.md` and `Architecture.md`. Each PRD requirement for the README (domains, deployment, migration, seed, configuration names, 50-Participant result) maps to a line in the new Deployment section. Verified by reading the diff; no automated test applies.

## Implementation summary

README Deployment section added, stale email and status statements corrected, Architecture.md status and claims ledger updated (commit 8496c5a).

## Verification evidence

Commit `8496c5a` changes `README.md` and `Architecture.md`. Each PRD requirement for the README (domains, deployment, migration, seed, configuration names, 50-Participant result) maps to a line in the new Deployment section. Verified by reading the diff; no automated test applies.

## Authorship

Codesuke <codesuke@gmail.com> is the repository author. Probes and docs were produced with an AI agent under the user's direction.
