# Bootstrap Checklist

Run through this once, right after creating a new repo from the Starter-Pack template. Delete this file when done — it has no purpose once the project is configured.

## 1. Identity

- [ ] Replace `{Project Name}` in `README.md`, `CONTEXT.md`, `Brand.md`, `DESIGN.md`, and `Architecture.md`.
- [ ] Set the repo slug (`{ORG}/{REPO}`) in `docs/agents/issue-tracker.md`.
- [ ] Update `LICENSE` with the current year and copyright holder (or replace it entirely if this project isn't MIT/isn't open-source).

## 2. Domain & Product Docs

- [ ] Fill in `CONTEXT.md` as real product terms get settled through `/grilling`; do not guess terms upfront.
- [ ] Fill in `Brand.md` and `DESIGN.md`, or replace each with `N/A — ...` if this project has no user-facing surface (see the comment in each file).
- [ ] Fill in `Architecture.md` once the stack and top-level layout are decided.

## 3. Stack Conventions

- [ ] Fill in `docs/agents/stack-conventions.md` with version-accurate, curated rules for the actual stack: rendering/execution model, data-fetching and mutation patterns, caching, security boundaries specific to the framework, bundling/asset rules, and a "version watch" section noting what breaks on the next major upgrade. See [ListItUp's `docs/agents/nextjs-conventions.md`](https://github.com/VirtuNode-dev/ListItUp/blob/main/docs/agents/nextjs-conventions.md) for the shape and depth this should reach — a curated, version-pinned subset of the relevant framework skill(s), not a restatement of the framework's own docs. Starter skeleton:
  ```md
  # {Framework} Conventions

  Rules for `{stack}` version `{X.Y}`. This is a curated subset of `{relevant skill(s)}`; consult those directly for anything not covered here, and re-check this doc when bumping major versions.

  ## {Rendering / Execution Model}

  ## {Data Fetching & Mutations}

  ## {Caching, if applicable}

  ## Security

  ## Version Watch

  Things that will bite on the next major upgrade.
  ```
- [ ] Rename the file if you want it to read stack-specific, e.g. `docs/agents/nextjs-conventions.md`, and update the `@docs/agents/stack-conventions.md` import in `AGENTS.md` and the reference in `docs/agents/code-quality.md` to match.
- [ ] If this project touches AI/ML, add `@docs/agents/ai-ml-conventions.md` to `AGENTS.md`'s imports. It ships pre-filled with a curated checklist — opt-in, not automatic.
- [ ] If this project touches blockchain/smart contracts, add `@docs/agents/blockchain-conventions.md` to `AGENTS.md`'s imports. Same pre-filled, opt-in pattern.

## 4. Project Tooling

- [ ] After choosing the stack, add only the package manifest, formatter, linter, hooks, test runner, build tooling, dependency automation, security scanning, and CI/CD that the project actually requires.
- [ ] Document the chosen local commands and required merge checks in `CONTRIBUTING.md` and the stack-conventions document.
- [ ] Keep generated-project automation out of the template until its runtime, deployment model, and risk profile are known.

## 5. Governance

- [ ] Update `CONTRIBUTING.md`'s "Development Setup" section with real prerequisites and steps.
- [ ] Update `SECURITY.md`'s contact/reporting instructions.
- [ ] Confirm `CODE_OF_CONDUCT.md`'s contact email.
- [ ] Decide if this project is actually going public. If not, it's fine to leave the governance files in place — they cost nothing sitting unused in a private repo.

## 6. Design-Engineer (only if this project has a UI)

- [ ] Leave `.design-engineer/` as-is; it fills in naturally the first time you run the `de-*` skill suite against a real feature.

## 7. Finish

- [ ] Remove the "Using This As A Template" section from `README.md`.
- [ ] Delete this file (`BOOTSTRAP.md`).
- [ ] Commit: `chore: bootstrap project from Starter-Pack template`.
