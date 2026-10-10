---
name: to-tickets
description: Split a GitHub PRD/spec issue into approved vertical, horizontal, or hybrid implementation slices, then publish them as native GitHub sub-issues with blocking relationships.
---

# To Tickets

Turn one canonical GitHub PRD/spec issue into implementation slices. GitHub Issues is the only home for planned and active slices; never create local ticket files.

## 1. Read the PRD

Require a GitHub issue number or URL. Fetch its full body and comments, then read relevant domain docs, ADRs, and code. If the source is not yet a GitHub PRD/spec issue, stop and direct the user to `/to-specs`.

## 2. Choose the slice shape

Recommend a shape and explain why before drafting:

- **Vertical** (default for product behavior): a narrow, complete, independently demoable path through the necessary layers.
- **Horizontal** (valid for foundations and wide changes): a coherent layer, contract, migration batch, infrastructure change, or documentation change that is independently verifiable but not meaningfully demoable end to end.
- **Hybrid**: horizontal enabling or migration slices followed by vertical behavior slices.

Do not create arbitrary layer-by-layer tickets when vertical slices can land independently. For a wide refactor, use expand-migrate-contract: add the new contract, migrate callers in verifiable batches, then remove the old contract.

## 3. Draft the slices

Every slice must:

- fit in one fresh implementation context;
- declare `Slice type: vertical` or `Slice type: horizontal`;
- deliver independently observable or verifiable progress;
- contain behavior-focused acceptance criteria and a useful test seam;
- name genuine blockers without manufacturing a linear chain;
- avoid volatile file paths and implementation snippets unless a settled prototype encodes the contract more precisely than prose.

Present the draft as a numbered list with title, type, blockers, delivery, and acceptance criteria. Ask the user to approve the granularity, shape, and edges. Iterate until approved.

## 4. Publish to GitHub

Create one issue per approved slice in dependency order and apply `ready-for-agent`. Use this body:

```markdown
## Parent PRD

<PRD issue URL>

## Slice type

Vertical | Horizontal

## What to build

<independently observable or verifiable outcome>

## Acceptance criteria

- [ ] <criterion>

## Test seam

<highest useful public seam>
```

Link every slice to the PRD with GitHub's native parent/sub-issue relationship. Add native `blocked_by` relationships for every declared edge. Do not encode relationships only in prose when the native relationship is available.

Return the published issue URLs and identify the initial frontier. Do not implement, close the PRD, or create files in `docs/`.
