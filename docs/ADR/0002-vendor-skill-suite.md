# Vendor The Matt Pocock Skill Suite In The Repo

> Workflow skill ownership and naming are superseded in part by [ADR 0004](0004-github-first-delivery-records.md). The general decision to vendor upstream skills remains accepted.

Starter-Pack vendors the `mattpocock/skills` suite directly in the repo (`.agents/skills/`, `.claude/skills/`, `skills-lock.json`, installed via `npx skills@latest add mattpocock/skills`) instead of relying solely on each machine's global `~/.claude/skills/` install. This reverses the assumption in [ADR 0001](0001-stack-agnostic-operating-system.md)'s surrounding docs (AGENTS.md previously stated skills "are installed globally and are not part of this repo").

## Status

accepted

## Considered Options

- Gitignore the project-local install, keep skills machine-global only — every clone/agent re-runs `npx skills add` to get them, repo tree stays clean.
- Vendor the skill suite in the repo (chosen).
- Remove the project-local copy entirely and only refresh the global install.

## Consequences

- Every team member and every agent working in a clone of this repo (or a project generated from it) gets the exact same pinned skill versions (`skills-lock.json`) with no separate install step — important since Starter-Pack is used by a team, not a single developer.
- The repo also keeps depending on the corresponding global install for skills invoked outside a Starter-Pack-derived repo; `to-prd`/`to-issues` (stale, pre-rename) remain in the global `~/.claude/skills/` alongside the current `to-spec`/`to-tickets` until a separate cleanup removes them — vendoring in-repo doesn't touch that.
- `skills-lock.json` and `.agents/skills/`, `.claude/skills/` need a periodic `npx skills update` to stay current; a stale vendored copy can drift from upstream `mattpocock/skills`.
- AGENTS.md's skill references must name the actual vendored skills (`to-spec`, `to-tickets`, `to-questionnaire`, `implement`, `grill-with-docs`) rather than the deprecated `to-prd`/`to-issues` names.
