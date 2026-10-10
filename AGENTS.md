# Agent Guide

This repo is intended to be built with AI agents, but the source of truth stays in the repository. Agents should read the docs first, make decisions explicit, and leave durable context behind when a decision changes the project.

## Auto-Loaded Context

Claude Code imports these automatically into every session in this repo (do not wrap the lines below in backticks or code fences — that disables the import):

@Architecture.md
@docs/agents/code-quality.md
@docs/agents/stack-conventions.md

## Working Rules

- Read the domain docs (`docs/agents/domain.md`) before planning work.
- Read `docs/build-memory.yaml` before changing existing behavior so the implementation plan accounts for what currently works and its known limitations.
- Prefer small vertical slices that are demoable end to end. Use horizontal slices when foundational, migration, infrastructure, or documentation work is independently verifiable but not meaningfully demoable.
- Use test-driven development for product behavior: one failing behavior test, minimal implementation, then refactor.
- Keep implementation details out of `CONTEXT.md`; it is a domain glossary, not a spec.
- Record meaningful architecture decisions in `docs/ADR/`.
- Keep planned and active PRDs/specs and slices only in GitHub Issues. Archive them under `docs/Specs-Completed/` only after implementation.
- Use `/grilling` to settle decisions before publishing a PRD. Do not create a local planning document from the grilling session.
- Avoid broad rewrites unless a spec or ADR explicitly calls for them.
- Follow `docs/agents/code-quality.md` for clean-code expectations and `docs/agents/stack-conventions.md` for stack-specific rules once that file is filled in (see `BOOTSTRAP.md`).

## Agent Skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default Matt Pocock skills triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with root domain docs and ADRs in `docs/ADR/`. See `docs/agents/domain.md`.

### Code quality

Stack-agnostic clean-code baseline, plus stack-specific rules once configured. See `docs/agents/code-quality.md` and `docs/agents/stack-conventions.md`.

## Preferred Skill Workflow

Use this workflow, in order, for product planning and implementation:

1. `grilling`: Stress-test the idea until decisions, constraints, and unresolved items are explicit. The output stays in the conversation as the handoff to the PRD.
2. `to-specs`: Turn the settled conversation into one PRD/spec and publish it as a GitHub Issue. Do not create a local planned copy.
3. `to-tickets`: Break the PRD into approved vertical, horizontal, or hybrid slices. Publish them as native GitHub sub-issues with native blocking edges. Do not create local planned ticket files.
4. `implement-spec`: Implement ready slices against their acceptance criteria, using red-green-refactor for product behavior and `code-review` before completion. When all slices ship, archive the PRD and slices under `docs/Specs-Completed/`.

At completion, `implement-spec` uses `record-build` to prepend an agent-readable changelog entry to `docs/build-memory.yaml`: what changed, what works, known limitations, and verified author/co-author attribution. See `docs/Specs-Completed/README.md` for the archive shape.

The upstream skill suite is vendored in this repo (`.agents/skills/`, `.claude/skills/`, `skills-lock.json` — see [ADR 0002](docs/ADR/0002-vendor-skill-suite.md)) and refreshed with `npx skills update`. The workflow-specific `grilling`, `to-specs`, `to-tickets`, `implement-spec`, and `record-build` skills are repo-owned and intentionally excluded from upstream refreshes; see [ADR 0004](docs/ADR/0004-github-first-delivery-records.md).

## Definition Of Ready

A feature is ready for an agent when:

- The user problem is clear.
- The core domain terms are either already in `CONTEXT.md` or deliberately added there.
- Acceptance criteria describe observable behavior.
- Dependencies and out-of-scope items are explicit.
- The intended test seam is named.

## Definition Of Done

A change is done when:

- The requested behavior works.
- Relevant tests pass, or the reason they could not be run is stated.
- Docs are updated when product language, architecture, or workflow changes.
- New ADRs are added only for hard-to-reverse, non-obvious decisions with real trade-offs.
