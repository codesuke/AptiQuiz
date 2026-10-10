# Spec: AI/ML Conventions

A spec never originates more than one new feature — it may touch or update multiple existing features, but only ever introduces one new one. Write in plain, terse, jargon-free English (ASD-STE100-lite): short sentences, no unnecessary hedging, no synonyms for the same concept within one document.

## Problem Statement

An agent building an AI/ML project from this template has nowhere to find AI/ML-specific agent-facing conventions. `docs/agents/stack-conventions.md` covers rendering, data-fetching, and caching — a shape that fits a typical web stack but says nothing about data/model versioning, experiment tracking, evaluation regression gates, training/serving skew, or key concerns unique to ML work. Left unfilled, an agent either invents its own ad hoc conventions per project (inconsistent across projects built from this template) or skips these concerns entirely.

## Solution

Add `docs/agents/ai-ml-conventions.md` to Starter-Pack, pre-filled with a curated, agent-facing checklist covering the concerns real-world AI/ML projects document beyond `stack-conventions.md`'s scope: data/model versioning, experiment tracking, model & dataset documentation, evaluation harness & regression gates, training/serving skew checks, data privacy boundaries, prompt/config versioning for LLM features, and reproducible environments. The doc ships with real, curated content — not an empty per-project placeholder — because these concerns are framework-independent and already concrete from research (`docs/Research/ai-ml-conventions.md`). It is wired opt-in via a new `BOOTSTRAP.md` checklist step, not an unconditional `AGENTS.md` import, since most Starter-Pack projects are neither AI nor ML projects.

## User Stories

1. As an agent bootstrapping an AI/ML project from this template, I want a pre-filled `docs/agents/ai-ml-conventions.md`, so that I start from a curated checklist instead of inventing conventions from scratch.
2. As an agent bootstrapping a non-AI/ML project, I want `ai-ml-conventions.md` to stay un-imported by default, so that my `AGENTS.md` context footprint doesn't carry irrelevant rules.
3. As an agent versioning data and models, I want the doc to state the rule that data/model bytes never live directly in the main git history the way code does, so that I know to reach for a DVC-style or equivalent tracking approach instead of committing large binary artifacts.
4. As an agent running a training or evaluation job, I want the doc to name the experiment-tracking minimums (params, metrics, artifacts, code version, dataset version), so that any run is reproducible from its record alone regardless of which tool the project adopts.
5. As an agent introducing a new model or dataset, I want the doc to require a lightweight model-card/dataset-card (intended use, training data, known limitations/biases, eval results), so that I don't ship a model with no documentation trail.
6. As an agent changing a model or prompt, I want the doc to require a named, versioned eval suite that must not regress before the change is done, so that model-quality changes get the same gate that `/smell` gives code changes.
7. As an agent validating a model before it ships, I want the doc to remind me to check training/serving skew — validating against data collected after the training cutoff, and testing data-loading infrastructure independently from model quality — so that I don't rely on an optimistic or leaked evaluation split.
8. As an agent touching training or evaluation data, I want the doc to state the data-privacy boundary explicitly (PII stripped or dataset flagged sensitive, storage never world-readable, manual data inspection gated by privacy status), so that a privacy violation isn't introduced by default debugging habits.
9. As an agent building an LLM-based feature, I want the doc to require prompts and generation configs to be versioned and alias-tagged the same way model artifacts are, so that prompt changes have the same reproducibility and rollback guarantees as model changes.
10. As an agent setting up training or evaluation code, I want the doc to require a pinned dependency/environment spec, so that another agent or a CI job can repeat the run later.
11. As a developer bootstrapping a new AI/ML project, I want `BOOTSTRAP.md` to tell me to add `@docs/agents/ai-ml-conventions.md` to `AGENTS.md`'s imports, so that opting in is a discoverable, one-line step rather than something I have to know to do unprompted.
12. As a developer bootstrapping a project that is both a chosen web/backend stack and an AI/ML project, I want to import both `stack-conventions.md` and `ai-ml-conventions.md`, so that both sets of conventions apply together, not exclusively.

## Implementation Decisions

- Decision: Add `docs/agents/ai-ml-conventions.md` as a new, standalone file, pre-filled with a curated checklist derived from `docs/Research/ai-ml-conventions.md`'s Recommendation section, covering: data/model versioning discipline, experiment tracking minimums, model & dataset documentation (cards), evaluation harness & regression gate, training/serving skew check, data privacy boundary, prompt/config versioning for LLM-based features, and reproducible environments.
  - Rationale: Per [ADR 0003](../ADR/0003-ai-ml-and-blockchain-conventions.md), these concerns are framework-independent and already concrete from research, unlike `stack-conventions.md`'s content which genuinely varies by framework (per [ADR 0001](../ADR/0001-stack-agnostic-operating-system.md)) and so ships empty. Shipping `ai-ml-conventions.md` empty, like `stack-conventions.md`, would waste settled knowledge the research already produced.
- Decision: `docs/agents/ai-ml-conventions.md` is not imported by default in `AGENTS.md`. Instead, `BOOTSTRAP.md` gains a new opt-in checklist step: if the project touches AI/ML, add `@docs/agents/ai-ml-conventions.md` to `AGENTS.md`'s imports.
  - Rationale: Most Starter-Pack projects are neither AI nor ML projects; an unconditional import would carry irrelevant context and rules into every project's `AGENTS.md`.
- Decision: `docs/agents/ai-ml-conventions.md` is additive to, not a replacement for, `docs/agents/stack-conventions.md`. A project that is both a chosen stack (e.g. Python) and an AI/ML project imports both docs.
- Decision: This spec covers the AI/ML conventions doc only. The equivalent blockchain conventions doc is a separate feature with its own spec, per ADR 0003's "one feature per spec" rule and the map's decomposition (issue #11).
- Decision: This is a documentation-only change. No code, schema, or API surface is touched.

## Testing Decisions

- This is a docs-only change; there is no code seam to test. "Passing" means: `docs/agents/ai-ml-conventions.md` exists, covers every checklist item named in the Solution section above, reads as a curated checklist (not a restatement of external tool docs), and `BOOTSTRAP.md`'s new opt-in step is discoverable alongside the existing "Stack Conventions" step.
- Verification is a read-through: confirm the new doc doesn't duplicate `stack-conventions.md`'s scope (rendering/data-fetching/caching), confirm the `BOOTSTRAP.md` step names the exact import line an agent should add, and confirm `AGENTS.md` is unchanged (no unconditional import added).
- Prior art: this repo's own doc-only changes ship without an automated test, verified by review alone (e.g. `docs/Specs-Planned/skill-provenance-flexibility.md`, `docs/Specs-Planned/template-enrichment.md`).

## Out of Scope

- Deliberately excluded: Folding AI/ML conventions into `stack-conventions.md` instead of a dedicated doc — rejected in ADR 0003; `stack-conventions.md`'s content varies by framework and ships empty per project, while AI/ML conventions are already concrete and would be wasted if left blank.
- Deliberately excluded: Importing `ai-ml-conventions.md` unconditionally in `AGENTS.md` — rejected in ADR 0003; most projects don't need it, and an unconditional import would bloat every project's context footprint.
- Deliberately excluded: Authoring the equivalent blockchain conventions doc — that is a separate spec (ticket #21), per the map's one-feature-per-spec rule.
- Deferred: Naming or recommending specific tool choices (e.g. mandating MLflow over Weights & Biases) beyond what the research already cites as illustrative examples — the checklist states what must be tracked/versioned/gated, not which vendor's product to use; a specific project can choose its own tooling.
- Deferred: A mechanism to detect or warn when a project's actual practice has drifted from the checklist — not requested, no evidence it's needed yet.

## Further Notes

- Note: Settled via [ADR 0003](../ADR/0003-ai-ml-and-blockchain-conventions.md), which records the decision to add this doc and how it's wired opt-in — no further investigation was needed before drafting this spec.
- Note: The full checklist content is grounded in primary-source research in [`docs/Research/ai-ml-conventions.md`](../Research/ai-ml-conventions.md); an implementer filling in the actual file content should draw directly from that research's Recommendation section and citations.
- Note: Originates from wayfinder ticket ["Draft and publish the ai-ml-conventions spec via to-spec"](https://github.com/VirtuNode-dev/Starter-Pack/issues/20), part of the ["Harden Starter-Pack"](https://github.com/VirtuNode-dev/Starter-Pack/issues/11) map.

## Build Summary

Shipped as a new, pre-filled `docs/agents/ai-ml-conventions.md` covering all eight checklist areas (versioning, experiment tracking, cards, eval/regression gate, skew, privacy, prompt/config versioning, reproducible environments), plus an opt-in `BOOTSTRAP.md` step. Not imported unconditionally in `AGENTS.md`, as decided.

## Slice Log

- [#32 Write docs/agents/ai-ml-conventions.md](https://github.com/VirtuNode-dev/Starter-Pack/issues/32) — commit `8be0b90`.
- [#33 Wire the AI/ML opt-in step into BOOTSTRAP.md](https://github.com/VirtuNode-dev/Starter-Pack/issues/33) — commit `9d6c4e7`.

## Follow-Ups

- None.
