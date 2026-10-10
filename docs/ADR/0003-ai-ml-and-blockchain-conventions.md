# AI/ML And Blockchain Get Dedicated, Pre-Filled Convention Docs

Starter-Pack adds `docs/agents/ai-ml-conventions.md` and `docs/agents/blockchain-conventions.md`, each pre-filled with the curated checklist from its research ([`docs/Research/ai-ml-conventions.md`](../Research/ai-ml-conventions.md), [`docs/Research/blockchain-conventions.md`](../Research/blockchain-conventions.md)), rather than folding these concerns into `docs/agents/stack-conventions.md` or leaving them as empty per-project placeholders. Unlike `stack-conventions.md` — whose content genuinely varies by framework and so ships empty per [ADR 0001](0001-stack-agnostic-operating-system.md) — these two domains' concerns (data/model versioning, eval regression gates, upgrade safety, key-management tiers, etc.) are framework-independent and already concrete from research, so leaving them blank would waste settled knowledge. Both new docs are wired opt-in via `BOOTSTRAP.md` rather than unconditionally imported in `AGENTS.md`, since most Starter-Pack projects are neither AI/ML nor blockchain projects.

## Status

accepted

## Considered Options

- Rely on the existing `stack-conventions.md` slot alone; treat AI/ML and blockchain as just another stack choice.
- Add dedicated docs as empty placeholders, filled in per-project like `stack-conventions.md`.
- Add dedicated docs, pre-filled with the research checklists, wired opt-in via `BOOTSTRAP.md` (chosen).
- Add dedicated docs, pre-filled, but imported unconditionally in `AGENTS.md` like `stack-conventions.md`.

## Consequences

- `docs/agents/ai-ml-conventions.md` and `docs/agents/blockchain-conventions.md` ship as real, curated content (from the research recommendations), not skeletons — a project prunes/tunes rather than authoring from scratch.
- `BOOTSTRAP.md` gains an opt-in step per doc ("if this project touches AI/ML / blockchain, add `@docs/agents/{ai-ml,blockchain}-conventions.md` to `AGENTS.md`'s imports"); neither doc is imported by default, keeping the template's context footprint lean for the common case.
- The two docs are independent features: each graduates its own task ticket and its own `to-spec` spec (per [the map](https://github.com/VirtuNode-dev/Starter-Pack/issues/11)'s "one feature per spec" rule) rather than a single combined spec.
- `stack-conventions.md`'s shape and per-project-fill pattern (ADR 0001) is unchanged; these two docs are a new, distinct pattern (`docs/agents/<domain>-conventions.md`, pre-filled + opt-in) rather than an extension of it.
- If a project is both, e.g., a Python stack *and* AI/ML, it imports both `stack-conventions.md` and `ai-ml-conventions.md` — the two are additive, not exclusive.
