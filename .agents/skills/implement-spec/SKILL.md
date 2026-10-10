---
name: implement-spec
description: Implement an approved GitHub PRD/spec through its slice sub-issues, verify each slice, and archive the completed PRD and slices. Use when the user provides a PRD or slice issue to build.
---

# Implement Spec

Implement from GitHub Issues, which remain authoritative until the whole PRD ships.

## Start from the issue graph

1. Resolve the supplied GitHub PRD or slice issue and read its full body, comments, parent, sub-issues, and blocking relationships.
2. State the PRD and slice being implemented. If the reference cannot identify one issue safely, ask for the issue reference.
3. Require approved slice sub-issues. If a PRD has not been sliced, stop and direct the user to `/to-tickets`.
4. Work only on a frontier slice: an open slice whose blockers are closed. Respect whether the issue declares a vertical or horizontal slice.

## Implement each slice

- Use red-green-refactor for product behavior at the test seam named by the PRD or slice.
- Implement only the current slice's acceptance criteria and necessary prefactoring.
- Run focused checks while working and the relevant full checks before completion.
- Review the finished diff with `code-review`; resolve every documented-standard breach and every Spec finding, and explicitly disposition judgment-call smells.
- Commit the coherent slice, preserving verified author and co-author attribution. Close the slice only when its acceptance criteria and checks pass.
- Continue through the issue frontier when the user requested the full PRD. A single-slice request stops after that slice unless it completed the PRD.

If verification cannot run, do not represent the slice as complete. Report the exact limitation on the issue.

## Complete and archive the PRD

Only after every required slice is closed:

1. Confirm the PRD acceptance criteria against the delivered behavior.
2. Read `docs/Specs-Completed/README.md` and archive the final PRD plus every implemented slice in its required layout. Do not omit slice snapshots.
3. Use `record-build` to add an agent-readable changelog entry describing what changed, what works, known limitations, authorship, and verification evidence.
4. Close the PRD with links to the shipped change and archive.

Never create planned or in-progress spec/slice documents under `docs/`.
