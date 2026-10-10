# Specs — Completed

Completed PRDs/specs and their implemented slices are archived here. Planned and active PRDs and slices live only in GitHub Issues.

## Trigger

Archive only after every required slice is implemented, verified, and closed. `/implement-spec` then snapshots the final GitHub issue content; nothing moves from a planned-docs folder.

## Layout

New archives use this layout:

```text
<prd-issue>-<slug>/
├── PRD.md
└── slices/
    └── <slice-issue>-<slug>.md
```

`PRD.md` contains the final PRD issue snapshot, build summary, verification summary, authorship, and follow-ups. Each slice file contains the final slice issue snapshot, slice type, acceptance-criteria result, implementation summary, verification evidence, authorship, and issue URL.

The flat Markdown files already in this directory are legacy completed records and do not need migration.
