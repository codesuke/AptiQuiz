# GitHub-First Delivery Records

Planned and active PRDs/specs and implementation slices live only as GitHub Issues. Local Markdown snapshots and the YAML build memory are created only after implementation, when the final issue state can be archived without maintaining duplicate planning sources.

The primary workflow is `/grilling` → `/to-specs` → `/to-tickets` → `/implement-spec`. The repo owns the customized `grilling`, `to-specs`, `to-tickets`, `implement-spec`, and `record-build` skills; they are not refreshed from the upstream skill lock.

## Status

accepted

## Considered Options

- Keep planned specs in both GitHub Issues and `docs/Specs-Planned/`.
- Keep GitHub as the sole planning source and archive completed work locally (chosen).
- Keep all history only in GitHub without local completion records.

## Consequences

- Agents have one authoritative source while work changes.
- Completed PRDs and slices remain searchable in the repository after delivery.
- `docs/build-memory.yaml` provides a newest-first, agent-readable changelog of implemented behavior, current working state, known limitations, verification evidence, and authorship.
- Repo-owned workflow skills must be reviewed after upstream skill-suite updates because their behavior is intentionally local.
