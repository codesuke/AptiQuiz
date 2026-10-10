# {Project Name}

{One or two sentence description of what this project is.}

> This repository was created from **Starter-Pack**, a template repo that ships a
> stack-agnostic "operating system" for building with AI coding agents: durable
> project docs, an issue/spec lifecycle, and code-quality conventions. If you are
> looking at this file inside Starter-Pack itself rather than a project generated
> from it, see [Starter-Pack's own README section](#using-this-as-a-template) below.

## Getting Started

{Install steps, environment setup, how to run the project locally.}

## How Work Flows Through This Repo

Idea to shipped feature, in order:

1. **Grill it** — `/grilling` resolves the product decisions and produces a settled conversational handoff.
2. **Make the PRD** — `/to-specs` publishes one single-feature PRD/spec as a GitHub Issue using [`docs/Templates/PRD.md`](docs/Templates/PRD.md). No planned local copy is created.
3. **Slice it** — `/to-tickets` publishes approved vertical, horizontal, or hybrid slices as native GitHub sub-issues and wires their blocking edges.
4. **Build it** — `/implement-spec` implements ready slices with behavior-first testing and review. After every slice ships, it archives the PRD and slice snapshots under [`docs/Specs-Completed/`](docs/Specs-Completed/README.md) and adds an agent-readable changelog entry to [`docs/build-memory.yaml`](docs/build-memory.yaml) describing what changed, what works, its limitations, and authorship.

Full skill list and details: `AGENTS.md`'s Preferred Skill Workflow section. These skills are vendored in-repo (`.agents/skills/`, `.claude/skills/`) so every clone gets the same pinned versions with no separate install.

## Rules & Agent Conventions

This repo is built by humans and AI agents under the same rules — the repository is the source of truth, not chat history.

**Core rules**

- [`AGENTS.md`](AGENTS.md) is the constitution: every agent session reads it first, along with its auto-loaded imports (`Architecture.md`, `docs/agents/code-quality.md`, `docs/agents/stack-conventions.md`).
- Clean-code baseline in [`docs/agents/code-quality.md`](docs/agents/code-quality.md): small single-purpose functions, no magic numbers, no dead code, comments explain _why_ not _what_. Stack-specific rules layer on top in `docs/agents/stack-conventions.md` once a stack is chosen.
- A PRD/spec never introduces more than one new feature at a time and is written in plain, jargon-free English — see [`docs/Templates/PRD.md`](docs/Templates/PRD.md).
- Architecture decisions that are hard to reverse and non-obvious get an ADR in [`docs/ADR/`](docs/ADR/README.md) — not every decision, only the durable ones.
- Run `/smell` against the target branch before opening a PR on any non-trivial feature, refactor, or bugfix; treat `BLOCKER`/`HIGH` findings as pre-review fixes.

**AI agent conventions**

- Upstream skills are vendored in-repo (`.agents/skills/`, `.claude/skills/`, pinned by `skills-lock.json`) and refreshed with `npx skills update`. Repo-owned delivery skills are versioned directly with the project and are not overwritten by that refresh.
- Issues and specs live on GitHub Issues (see [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)), tagged with the triage vocabulary in [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md): `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` (plus `good first issue` for external contributors).
- Domain vocabulary lives in `CONTEXT.md` — agents use those exact terms and flag any ADR a proposal conflicts with (see [`docs/agents/domain.md`](docs/agents/domain.md)).
- `docs/sessions/`, `docs/QnA/`, and `docs/questionnaire/` each have their own file-naming convention — check each folder's README before writing into it.

**Getting started, read in this order:** [`AGENTS.md`](AGENTS.md) → [`CONTEXT.md`](CONTEXT.md) → [`Architecture.md`](Architecture.md) → [`docs/agents/code-quality.md`](docs/agents/code-quality.md) + [`docs/agents/stack-conventions.md`](docs/agents/stack-conventions.md) → [`CONTRIBUTING.md`](CONTRIBUTING.md) for the human PR process.

## Documentation

This repo keeps durable project knowledge in-tree instead of chat history:

- [`AGENTS.md`](AGENTS.md) — how AI agents (and humans) should work in this repo.
- [`CONTEXT.md`](CONTEXT.md) — the domain glossary. Use these exact terms in code, issues, and PRs.
- [`Brand.md`](Brand.md) — product voice and positioning.
- [`DESIGN.md`](DESIGN.md) — interface direction.
- [`Architecture.md`](Architecture.md) — repo layout and where new code belongs.
- [`docs/`](docs/README.md) — completed delivery records, architecture decisions, templates, build memory, and agent configuration. See its README for the full operating model.

## Using This As A Template

If you just used **Use this template** to create this repo, you are not done yet:

1. Open [`BOOTSTRAP.md`](BOOTSTRAP.md) and work through the checklist.
2. Delete this section (and `BOOTSTRAP.md` itself) once the checklist is complete.

Starter-Pack deliberately ships without package-manager hooks, formatter configuration, dependency automation, or CI/CD workflows. Add those during bootstrap only when the generated project's stack and requirements are known.

## License

{See [`LICENSE`](LICENSE).}
