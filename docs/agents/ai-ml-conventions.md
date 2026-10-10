# AI/ML Conventions

Agent-facing checklist for AI/ML projects built from this template, covering concerns `docs/agents/stack-conventions.md` doesn't reach: versioning, experiment tracking, evaluation, and reproducibility for models and data. Additive, not a replacement — import both if the project is also a chosen web/backend stack. Grounded in [`docs/Research/ai-ml-conventions.md`](../Research/ai-ml-conventions.md).

## Data & Model Versioning

- Data and model bytes never live directly in the main git history, the way code does. Track them with a DVC-style approach or equivalent: commit lightweight metadata files, keep the actual bytes in remote storage.
- Version every model on registration. Compare iterations, roll back, and run staging vs. production versions in parallel — don't overwrite a model in place.
- Prefer mutable aliases (e.g. `@champion`, `@production`) over rigid lifecycle stages. Reassign an alias to promote a version without redeploying infrastructure.
- Link every model version back to the run, dataset, and parameters that produced it. A model with no lineage isn't usable in production.

## Experiment Tracking

- Log four things per run, at minimum: parameters, metrics, artifacts, and code version (git commit).
- Link every run to the dataset version it trained on.
- A run must be reproducible from its record alone — regardless of which tool (MLflow, W&B, or none) the project uses.

## Model & Dataset Documentation

- Every model an agent introduces gets a lightweight model card: intended use, training data, known limitations/biases, eval results.
- Every dataset an agent introduces gets a lightweight dataset card: provenance, sensitive attributes, access/retention policy, transformations applied.
- Cards are the default, not optional extra work. A model or dataset with no card has no documentation trail.

## Evaluation Harness & Regression Gate

- A named, versioned eval suite must run — and not regress — before a model or prompt change counts as done. This is the ML equivalent of `/smell` gating a code PR.
- Version eval task definitions themselves. A "fixed" eval must not silently invalidate historical comparisons — note the eval version alongside any reported result.
- Distinguish offline validation (metrics on held-out test data, vs. a baseline/production model) from online validation (canary/A-B before full rollout). Both are separate gates before a model ships.

## Training/Serving Skew

- Validate a model against data collected after its training cutoff, not a historical holdout — an optimistic split hides skew.
- Test data-loading infrastructure independently from model quality: confirm a model produces identical scores in training vs. serving before trusting an evaluation result.

## Data Privacy Boundary

- Strip PII from a dataset, or flag the dataset as sensitive, before an agent touches it.
- Never leave data or model storage world-readable.
- Manual "look at the training data" debugging is gated by privacy status — not a default habit.

## Prompt/Config Versioning (LLM Features)

- If the project builds LLM-based features, version prompts and generation configs the same way as model artifacts: immutable versions, mutable alias pointers (e.g. `@production`, `@staging`).
- Link every prompt version back to the evals that validated it.
- Never hand-edit a prompt inline in application code with no history — that's the prompt equivalent of a hardcoded magic number.

## Reproducible Environments

- Pin a dependency/environment spec (an `MLproject`-style file, or a lockfile) for any training or evaluation code.
- A run must be repeatable by another agent, or a CI job, from the pinned spec alone.
