# Domain Docs

How engineering skills should consume this repo's domain documentation.

## Before Exploring, Read These

- `CONTEXT.md` at the repo root for domain language.
- `Brand.md` for tone, positioning, and naming.
- `DESIGN.md` for product and interface direction.
- `Architecture.md` for repo layout and structure.
- `docs/build-memory.yaml` for implemented behavior, what currently works, and known limitations.
- `docs/ADR/` for architecture decisions relevant to the area being changed.

If any file is missing, proceed silently and use the best available context.

## File Structure

This is a single-context repo — see `Architecture.md` for the file layout.

## Use The Glossary Vocabulary

When output names a domain concept in an issue title, PRD, test name, UI proposal, or refactor plan, use the term as defined in `CONTEXT.md`.

If the needed concept is missing, use `/grilling` to resolve the term, then update `CONTEXT.md` before publishing the PRD.

## Flag ADR Conflicts

If a proposal contradicts an existing ADR, surface the conflict explicitly before implementing.
