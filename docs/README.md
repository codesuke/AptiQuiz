# Docs

![AptiQuiz](../Apti-App/apps/web/public/brand/aptiquiz-logo-readme.png)

Start with the [project README](../README.md), [contributor guide](../CONTRIBUTING.md), and [brand guide](../Brand.md).

This folder stores durable project knowledge: completed delivery records, architecture decisions, templates, build memory, and agent configuration. Planned and active PRDs and slices live only in GitHub Issues.

**New here? Read the [AptiQuiz Handbook](handbook/README.md).** It explains the product, the scoring, network delay, reconnection, cheating resistance, the 50-player test, the system design, and each technology in simple words.

## Folders

- `handbook/`: the plain-language guide to AptiQuiz, written in ASD-STE100 Simplified Technical English.
- `guide/`: deployment guides for Dokploy and DNS.
- `QnA/`: legacy or explicitly requested decision-session records. `/grilling` does not write here by default.
- `sessions/`: `wayfinder` session logs.
- `questionnaire/`: `to-questionnaire` output.
- `Specs-Completed/`: snapshots of implemented PRDs and their completed slice issues.
- `ADR/`: architecture decision records.
- `Templates/`: reusable issue and completion-record templates.
- `agents/`: configuration read by AI agent skills.
- `build-memory.yaml`: newest-first, agent-readable changelog of implemented behavior, current working state, known limitations, verification, and authorship.

## Operating Model

Use `/grilling` to settle decisions, `/to-specs` to publish the PRD issue, `/to-tickets` to publish its slices, and `/implement-spec` to build and archive them. See `AGENTS.md` for the full sequence.
