# Grill Session: Starter-Pack Scope And Delivery

> The generic CI/tooling outcome in question 5 was superseded by [ADR 0005](../ADR/0005-defer-project-automation.md). The rest of this historical session remains unchanged.

## Context

Designing Starter-Pack itself: a template repo meant to kick-start future projects with the user's "agentic norms" — good Skills, Workflows, and Agentic Rules, plus proper programming rules and regulations. Modeled on [VirtuNode-dev/ListItUp](https://github.com/VirtuNode-dev/ListItUp), the user's best-configured repo so far, and on work by Matt Pocock (skills: `smell`, `tdd`, `to-prd`, `to-issues`, `triage`) and Design Engineer (the `de-*` skill suite).

## Questions

### 1. Should the template be stack-agnostic or opinionated toward Next.js/TypeScript?

**Recommended answer**:

Stack-agnostic core (AGENTS.md, docs/ scaffold, ADR/QnA/Spec flow), with stack-specific convention docs left as an empty slot filled in per project.

**User answer**:

Stack-agnostic core.

**Settled outcome**:

`docs/agents/stack-conventions.md` ships as a placeholder, not pre-filled with Next.js-specific content. See [ADR 0001](../ADR/0001-stack-agnostic-operating-system.md).

### 2. How will new projects actually be started from this repo?

**Recommended answer**:

GitHub template repo — mark Starter-Pack as a template, new projects start via "Use this template," no scripting needed.

**User answer**:

GitHub template repo.

**Settled outcome**:

No scaffolding CLI was built. A `BOOTSTRAP.md` checklist substitutes for the manual find-and-replace step a CLI would normally automate.

### 3. Should Brand.md and DESIGN.md always be present, given not every project has a user-facing UI?

**Recommended answer**:

All four root context files present always; a non-UI project fills Brand.md/DESIGN.md with "N/A" rather than omitting them.

**User answer**:

All 4, always present.

**Settled outcome**:

`Brand.md` and `DESIGN.md` ship as placeholders with an inline comment explaining the "N/A" escape hatch for non-UI projects.

### 4. Should governance files (CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, LICENSE) ship by default given some projects stay private?

**Recommended answer**:

Include all, MIT license as the default.

**User answer**:

Include all, MIT default.

**Settled outcome**:

All four governance files ship every time. Costs nothing sitting unused in a private repo.

### 5. How should the CI/tooling layer handle the stack-agnostic vs. stack-specific split?

**Recommended answer**:

Generic parts ship live (root `husky` + `lint-staged` + `prettier`, `.github/workflows/dependency-review.yml`); stack-dependent parts (`ci.yml`, `codeql.yml`, `.github/dependabot.yml`) ship as stubs with TODOs.

**User answer**:

Generic parts always, rest stubbed.

**Settled outcome**:

`ci.yml` and `codeql.yml` trigger on `workflow_dispatch` only until filled in, so they don't fail automatically on push/PR before being configured. `dependabot.yml` ships with an empty `updates: []` plus commented examples.

### 6. Should there be a bootstrap checklist doc, given there's no scaffolding CLI?

**Recommended answer**:

Yes — a `BOOTSTRAP.md` checklist, deleted once complete.

**User answer**:

Yes.

**Settled outcome**:

`BOOTSTRAP.md` added at root, referenced from `README.md`.

### 7. Should `.design-engineer/` be pre-seeded with an example feature folder?

**Recommended answer**:

Seed an empty `.design-engineer/README.md` explaining the convention, no example subfolder (avoids stale sample content).

**User answer**:

Seed empty with README.

**Settled outcome**:

`.design-engineer/README.md` documents the per-feature output convention; the first real subfolder is created the first time the `de-*` skill suite runs.

### 8. How far should git/GitHub setup go this session?

**Recommended answer**:

`git init` and a local commit only; push and enabling the GitHub "template repository" setting are left to the user.

**User answer**:

git init + commit locally only.

**Settled outcome**:

No GitHub repo was created or pushed to during this session.

## Date

2026-07-14

## Follow-Ups

- Glossary updates: none — `CONTEXT.md` is reserved for each generated project's own domain language, not for Starter-Pack's meta-terminology.
- ADRs created: [0001-stack-agnostic-operating-system.md](../ADR/0001-stack-agnostic-operating-system.md).
- Specs affected: none.
