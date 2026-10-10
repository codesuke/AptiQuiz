---
name: to-specs
description: Turn a settled product conversation into a single-feature PRD/spec and publish it as a GitHub Issue. Use after grilling or when requirements are already resolved; never create a planned local spec file.
---

# To Specs

Publish the settled feature as the canonical PRD/spec issue. Do not reopen the interview or invent unresolved product decisions.

## Source of truth

- GitHub Issues is the only home for a planned or active PRD/spec.
- Do not write the PRD to `docs/` while work is planned or in progress.
- One PRD introduces at most one new feature.
- Use the vocabulary in `CONTEXT.md` and respect applicable ADRs.

If required decisions are still unresolved, stop and direct the user to `/grilling`. If the issue tracker is not configured, report the missing configuration instead of creating a local substitute.

## Publish the PRD

1. Read the relevant domain, architecture, and issue-tracker docs. Inspect the codebase enough to ground implementation and testing decisions.
2. Synthesize the settled conversation with `docs/Templates/PRD.md`. Keep the language terse and consistent. Acceptance criteria must describe observable behavior.
3. Name the highest useful public test seam. Prefer an existing seam.
4. Publish one GitHub Issue titled `[PRD] <feature name>` and apply `ready-for-agent`.
5. Return the issue number and URL. The next workflow step is `/to-tickets <issue reference>`.

Do not create slice issues, implementation code, or a local Markdown copy in this skill.
