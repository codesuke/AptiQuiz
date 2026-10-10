# Contributing to {Project Name}

Thanks for considering a contribution. This repo is built collaboratively by humans and AI agents, so the same rules apply to both — the source of truth is always the repository, not a chat history or a prior conversation.

By participating, you're expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Table of Contents

- [Before You Start](#before-you-start)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Testing Guide](#testing-guide)
- [Coding Standards](#coding-standards)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Finding Something to Work On](#finding-something-to-work-on)
- [Issue Labels](#issue-labels)

## Before You Start

Read these first, in this order:

1. [`AGENTS.md`](AGENTS.md) — the working rules for this repo, including test-driven development and documentation expectations.
2. [`CONTEXT.md`](CONTEXT.md) — the product glossary. Use these exact terms in code, issues, and PRs.
3. [`Architecture.md`](Architecture.md) — repo layout and where new code belongs.
4. [`docs/agents/code-quality.md`](docs/agents/code-quality.md) and [`docs/agents/stack-conventions.md`](docs/agents/stack-conventions.md) — the clean-code and stack-specific conventions this codebase follows.

If a term or convention is missing from those docs, that's worth raising in your issue or PR rather than guessing.

## Ways to Contribute

Code isn't the only useful contribution:

- **Report a bug** — open an [issue]({REPO_URL}/issues/new) with reproduction steps, expected vs. actual behavior, and your environment.
- **Propose a feature** — open an issue describing the problem you're trying to solve before proposing a specific solution; see `docs/agents/domain.md` for how this repo turns fuzzy ideas into specs.
- **Improve docs** — typos, unclear setup steps, and missing explanations are all fair game for a PR.
- **Review a PR** — thoughtful feedback on an open PR is as valuable as writing one.
- **Write code** — see [Finding Something to Work On](#finding-something-to-work-on) below.

## Development Setup

### Prerequisites

{List runtime, package manager, database, and any external service dependencies for local dev.}

### Steps

```bash
git clone {REPO_URL}.git
cd {project-directory}

# {Install, configure, and run steps go here.}
```

### Troubleshooting

{Common local-dev failure modes and fixes go here as they're discovered.}

## Project Structure

See [`Architecture.md`](Architecture.md) for the current, authoritative breakdown of the repo layout.

## Testing Guide

This repo uses test-driven development for product behavior: write one failing behavior test, implement the minimal code to pass it, then refactor. Tests should verify behavior through public interfaces, not implementation details.

{Document the actual test commands and test-file conventions once the stack is chosen.}

Run the lint, typecheck, test, and build checks configured for the project before opening a PR. This template does not prescribe those tools before the stack is chosen.

## Coding Standards

The full catalog lives in [`docs/agents/code-quality.md`](docs/agents/code-quality.md) and [`docs/agents/stack-conventions.md`](docs/agents/stack-conventions.md); the headline rules:

- Functions do one thing, at one level of abstraction, with no more than 3 arguments and no boolean-flag parameters that make a function do two things.
- Names reveal intent; duplication is refactored into shared logic rather than copy-adapted.
- No magic numbers, no dead code, no commented-out code — comments explain _why_, never _what_.

## Commit Message Convention

This repo uses [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`, for example:

```text
fix(auth): handle expired session tokens
feat(workspace): add invitation acceptance flow
docs(readme): document local dev setup
```

Common types: `feat`, `fix`, `docs`, `build`, `test`, `refactor`. Scope is usually the feature area.

## Pull Request Process

1. Open an issue first for anything non-trivial, so the approach can be discussed before code is written.
2. Keep the PR to one approved slice. Prefer a demoable vertical slice; use a horizontal slice only when the parent PRD identifies independently verifiable foundation, migration, infrastructure, or documentation work.
3. Make sure lint, typecheck, and the relevant test scripts pass — or explain in the PR description why one couldn't be run.
4. Update docs when product language, architecture, or workflow changes: `CONTEXT.md` for new domain terms, an ADR under `docs/ADR/` for decisions that are meaningful and hard to reverse.
5. Reference the issue the PR closes (`Closes #123`).
6. A maintainer will review, request changes if needed, and merge once the project's required checks pass and the review is resolved.

## Finding Something to Work On

Issues and PRDs live in GitHub Issues for this repo — see [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) for tracker conventions.

New to the project? Look for issues labeled `good first issue` — small, self-contained, and ready for a human to pick up without deep repo context.

## Issue Labels

| Label              | Meaning                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `needs-triage`     | Maintainer needs to evaluate this issue                                                    |
| `needs-info`       | Waiting on the reporter for more information                                               |
| `ready-for-agent`  | Fully specified, ready for an AFK coding agent                                             |
| `ready-for-human`  | Requires human implementation                                                              |
| `good first issue` | A `ready-for-human` issue that's also small and self-contained — a good first contribution |
| `wontfix`          | Will not be actioned                                                                       |

See [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) for the full reference.
