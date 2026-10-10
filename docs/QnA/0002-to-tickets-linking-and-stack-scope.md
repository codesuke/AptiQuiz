# Grill Session: To-Tickets Linking & Stack-Agnostic Scope Confirmation

## Context

Follow-up to [QnA 0001](0001-starter-pack-scope-and-delivery.md). A vision-alignment check against the user's stated goals for the docs/skills flow (session logging, questionnaire storage, spec template, ticket slicing, spec archival, and stack/technology conventions) found the flow already matched almost everywhere it was checked, but surfaced three open decisions the repo hadn't settled yet.

## Questions

### 1. Should `to-tickets` link slices to their parent spec via GitHub's native sub-issue relationship, or keep the existing text-only "Parent" reference?

**Recommended answer**:

Yes, make it native — matches how `wayfinder` already links tickets to its map, and gives a real dependency graph instead of prose that can drift.

**User answer**:

Yes, make it native.

**Settled outcome**:

`to-tickets` step 6 now links each published ticket to its parent issue via the tracker's native sub-issue relationship, reusing the `addSubIssue` primitive documented in `docs/agents/issue-tracker.md`. Implemented and pushed same session (commits `2ed7122`, `f4b7bdb`).

### 2. Should `to-tickets` keep deciding vertical vs. expand-contract silently, or surface its recommendation and ask the user to confirm?

**Recommended answer**:

Surface it — state the recommended shape and rationale, then ask for confirmation before drafting.

**User answer**:

Surface it, let me confirm.

**Settled outcome**:

`to-tickets` step 3 ("Recommend a slice shape") now states the recommended shape with a one- or two-sentence rationale and asks the user to confirm or override before drafting slices. Implemented same session (commit `2ed7122`).

### 3. Do the four listed tech stacks (Next.js, Hono, NestJS, Vue) and four languages (Rust, TypeScript, Go, Python) get the same pre-filled opt-in convention treatment AI/ML and Blockchain just received, or does ADR 0001's "stay empty, fill in per project" hold?

**Recommended answer**:

Keep ADR 0001 as-is — AI/ML and Blockchain are cross-cutting technology concerns layered on top of any stack; the stack itself is what ADR 0001 deliberately keeps generic so any project can bootstrap in whatever stack it needs.

**User answer**:

Wants the repo ready for agentic-assisted development without constraining which stack a project uses — complete flows for brainstorming, specs, tickets, and collaboration coding regardless of stack, not a fixed menu of pre-built stacks.

**Settled outcome**:

ADR 0001 stands unchanged. `docs/agents/stack-conventions.md` remains the empty, per-project-filled placeholder; no pre-built Next.js/Hono/NestJS/Vue/Rust/TypeScript/Go/Python convention docs are added. AI/ML and Blockchain remain the only pre-filled opt-in convention docs, since they're additive technology concerns rather than the stack itself.

## Date

2026-08-08

## Follow-Ups

- Glossary updates: none.
- ADRs created: none — question 3 reaffirms [ADR 0001](../ADR/0001-stack-agnostic-operating-system.md) rather than changing it.
- Specs affected: none — questions 1 and 2 were implemented directly as skill/doc patches (commits `2ed7122`, `f4b7bdb`), not routed through a spec.
