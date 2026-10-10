# Spec: Blockchain Conventions

A spec never originates more than one new feature — it may touch or update multiple existing features, but only ever introduces one new one. Write in plain, terse, jargon-free English (ASD-STE100-lite): short sentences, no unnecessary hedging, no synonyms for the same concept within one document.

## Problem Statement

An agent building a blockchain or smart-contract project from this template has nowhere to find blockchain-specific agent-facing conventions. `docs/agents/stack-conventions.md` covers rendering, data-fetching, and caching — a shape built for a typical web stack, not for concerns unique to on-chain code: upgrade safety, audit checklists, key management, and deployment discipline. Blockchain mistakes are unusually costly and hard to reverse once deployed, so leaving these conventions unfilled risks a project shipping without upgrade-safety rules, a pre-audit gate, or a sane key-management tier — not just a style inconsistency, but a real security gap.

## Solution

Add `docs/agents/blockchain-conventions.md` to Starter-Pack, pre-filled with a curated, agent-facing checklist covering the concerns real-world blockchain projects document beyond `stack-conventions.md`'s scope: upgrade safety rules, a pre-audit checklist, key-management tiers, deployment-script conventions, dependency pinning, pause/incident-response expectations, oracle usage, and a tooling baseline. The doc ships with real, curated content — not an empty per-project placeholder — because these concerns are framework-independent and already concrete from research (`docs/Research/blockchain-conventions.md`). It is wired opt-in via a new `BOOTSTRAP.md` checklist step, not an unconditional `AGENTS.md` import, since most Starter-Pack projects don't touch blockchain.

## User Stories

1. As an agent bootstrapping a blockchain project from this template, I want a pre-filled `docs/agents/blockchain-conventions.md`, so that I start from a curated, security-grounded checklist instead of inventing conventions from scratch.
2. As an agent bootstrapping a non-blockchain project, I want `blockchain-conventions.md` to stay un-imported by default, so that my `AGENTS.md` context footprint doesn't carry irrelevant rules.
3. As an agent writing or modifying an upgradeable contract, I want the doc to state upgrade-safety rules as hard constraints (no constructors, initializer-only setup, append-only storage layout, `__gap` reservation, `_disableInitializers()`, no `selfdestruct`/unchecked `delegatecall`), so that I don't introduce a storage-collision or takeover bug.
4. As an agent finishing a contract feature, I want a required pre-audit checklist (static analysis clean or findings triaged, coverage threshold met, a manual pass through the known-attacks list for anything holding real value), so that I have a concrete, repeatable gate before calling the feature done — mirroring how `/smell` gates a normal PR.
5. As an agent handling a private key or deployment credential, I want an explicit key-management tier table (local test accounts, testnet keystore, mainnet hardware wallet + multisig), so that I never hardcode or commit a key regardless of which network I'm targeting.
6. As an agent writing a deployment script, I want a named convention (one script per concern, numbered when order matters, config from env vars only, tested against its own resulting state, only the sanctioned CLI verify-and-broadcast path used), so that deployments are self-documenting and repeatable, not ad hoc.
7. As an agent adding or upgrading an on-chain dependency, I want a dependency-pinning rule (exact-pin, tagged releases only, treat a major bump as storage-layout-breaking), so that I don't introduce an unreviewed, potentially storage-incompatible upgrade.
8. As an agent shipping a contract that holds user value, I want the doc to require a pre-decided pause/incident-response answer (is this pausable, by whom, a runbook stub) before the feature is done, so that incident response isn't improvised for the first time during an actual incident.
9. As an agent integrating a price or data feed, I want an oracle-usage note steering me to a decentralized, staleness-checked feed over a single-source read, so that I don't introduce an oracle-manipulation vulnerability by default.
10. As an agent choosing tooling for a blockchain project, I want a named tooling baseline (a primary dev-loop tool, a static analyzer for CI, and an opt-in heavier formal-verification tier), so that tool choice isn't reinvented per project.
11. As a developer bootstrapping a new blockchain project, I want `BOOTSTRAP.md` to tell me to add `@docs/agents/blockchain-conventions.md` to `AGENTS.md`'s imports, so that opting in is a discoverable, one-line step rather than something I have to know to do unprompted.
12. As a developer bootstrapping a project that is both a chosen web/backend stack and a blockchain project, I want to import both `stack-conventions.md` and `blockchain-conventions.md`, so that both sets of conventions apply together, not exclusively.

## Implementation Decisions

- Decision: Add `docs/agents/blockchain-conventions.md` as a new, standalone file, pre-filled with a curated checklist derived from `docs/Research/blockchain-conventions.md`'s Recommendation section, covering: upgrade-safety rules as hard constraints, a required pre-audit checklist, a key-management tier table, a deployment-script convention, a dependency-pinning rule, a pause/incident-response expectation, an oracle-usage note (for projects touching price/data feeds), and a tooling baseline.
  - Rationale: Per [ADR 0003](../ADR/0003-ai-ml-and-blockchain-conventions.md), these concerns are framework-independent and already concrete from research, unlike `stack-conventions.md`'s content which genuinely varies by framework (per [ADR 0001](../ADR/0001-stack-agnostic-operating-system.md)) and so ships empty. Blockchain mistakes are also unusually costly and hard to reverse, which is why the doc states rules like upgrade safety as hard constraints rather than optional guidance.
- Decision: `docs/agents/blockchain-conventions.md` is not imported by default in `AGENTS.md`. Instead, `BOOTSTRAP.md` gains a new opt-in checklist step: if the project touches blockchain/smart contracts, add `@docs/agents/blockchain-conventions.md` to `AGENTS.md`'s imports.
  - Rationale: Most Starter-Pack projects don't touch blockchain; an unconditional import would carry irrelevant context and rules into every project's `AGENTS.md`.
- Decision: `docs/agents/blockchain-conventions.md` is additive to, not a replacement for, `docs/agents/stack-conventions.md`. A project that is both a chosen stack (e.g. TypeScript/Hardhat) and a blockchain project imports both docs.
- Decision: This spec covers the blockchain conventions doc only. The equivalent AI/ML conventions doc is a separate feature with its own spec (issue #20 → #23), per ADR 0003's "one feature per spec" rule and the map's decomposition (issue #11).
- Decision: This is a documentation-only change. No code, schema, or API surface is touched.

## Testing Decisions

- This is a docs-only change; there is no code seam to test. "Passing" means: `docs/agents/blockchain-conventions.md` exists, covers every checklist item named in the Solution section above, states the upgrade-safety and key-management rules as hard constraints (not soft suggestions), and `BOOTSTRAP.md`'s new opt-in step is discoverable alongside the existing "Stack Conventions" step.
- Verification is a read-through: confirm the new doc doesn't duplicate `stack-conventions.md`'s scope (rendering/data-fetching/caching), confirm the `BOOTSTRAP.md` step names the exact import line an agent should add, and confirm `AGENTS.md` is unchanged (no unconditional import added).
- Prior art: this repo's own doc-only changes ship without an automated test, verified by review alone (e.g. `docs/Specs-Planned/skill-provenance-flexibility.md`, `docs/Specs-Planned/template-enrichment.md`, `docs/Specs-Planned/ai-ml-conventions.md`).

## Out of Scope

- Deliberately excluded: Folding blockchain conventions into `stack-conventions.md` instead of a dedicated doc — rejected in ADR 0003; `stack-conventions.md`'s content varies by framework and ships empty per project, while blockchain conventions are already concrete and would be wasted if left blank.
- Deliberately excluded: Importing `blockchain-conventions.md` unconditionally in `AGENTS.md` — rejected in ADR 0003; most projects don't need it, and an unconditional import would bloat every project's context footprint.
- Deliberately excluded: Authoring the equivalent AI/ML conventions doc — that is a separate spec (issue #20 → #23), per the map's one-feature-per-spec rule.
- Deferred: Naming or mandating a single specific tool (e.g. requiring Foundry over Hardhat) beyond what the research cites as the reference/primary tool — the checklist states what must be checked/pinned/gated, not a rigid single-vendor mandate; a specific project can weigh alternatives.
- Deferred: Formal-verification tooling (e.g. Certora) as anything more than an opt-in heavier tier — not a default requirement per the research, only relevant for protocols whose risk profile warrants it.
- Deferred: A mechanism to detect or warn when a project's actual practice has drifted from the checklist — not requested, no evidence it's needed yet.

## Further Notes

- Note: Settled via [ADR 0003](../ADR/0003-ai-ml-and-blockchain-conventions.md), which records the decision to add this doc and how it's wired opt-in — no further investigation was needed before drafting this spec.
- Note: The full checklist content is grounded in primary-source research in [`docs/Research/blockchain-conventions.md`](../Research/blockchain-conventions.md); an implementer filling in the actual file content should draw directly from that research's Recommendation section and citations.
- Note: Originates from wayfinder ticket ["Draft and publish the blockchain-conventions spec via to-spec"](https://github.com/VirtuNode-dev/Starter-Pack/issues/21), part of the ["Harden Starter-Pack"](https://github.com/VirtuNode-dev/Starter-Pack/issues/11) map.

## Build Summary

Shipped as a new, pre-filled `docs/agents/blockchain-conventions.md` covering all eight checklist areas (upgrade-safety hard constraints, pre-audit checklist, key-management tiers, deployment-script convention, dependency pinning, pause/incident-response, oracle usage, tooling baseline), plus an opt-in `BOOTSTRAP.md` step. Not imported unconditionally in `AGENTS.md`, as decided.

## Slice Log

- [#34 Write docs/agents/blockchain-conventions.md](https://github.com/VirtuNode-dev/Starter-Pack/issues/34) — commit `1f3dc73`.
- [#35 Wire the blockchain opt-in step into BOOTSTRAP.md](https://github.com/VirtuNode-dev/Starter-Pack/issues/35) — commit `87f576f`.

## Follow-Ups

- None.
