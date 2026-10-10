---
name: record-build
description: Maintain docs/build-memory.yaml as an agent-readable changelog of implemented behavior, what currently works, known limitations, authorship, and delivery evidence. Use after verified changes ship.
---

# Record Build

Maintain `docs/build-memory.yaml` as the compact changelog agents read to understand the implemented state of the project.

Each entry must answer:

- What changed?
- What works now?
- What is limited, deprecated, or removed?
- Who implemented it?
- Where can an agent verify the claim?

## Evidence rules

- Record only implemented work. Never add planned or in-progress entries.
- Describe working behavior from observable results, not implementation trivia or aspirations.
- State known limitations explicitly. Use an empty list only when the delivered scope has no known limitation.
- Derive change facts from the completed PRD and slice issues, merged PRs, commits, test results, and completed archive docs.
- Do not guess implementation authorship. Use implementation commit authors, `Co-authored-by` trailers, implementation PR authors and commits, or explicit user confirmation. Do not treat the author of a PRD or slice issue as a build author without separate implementation evidence.
- Treat the person primarily responsible for the delivered implementation as `author`; list other material contributors under `co_authors`.
- Put the newest change first. Add a new entry when behavior changes; update an existing matching `id` only to correct or complete that same record. Do not erase history or append duplicates.
- Include `prd`, `slices`, and `archive` when the change came through the PRD workflow. Omit fields that genuinely do not apply to a verified fix, documentation change, or infrastructure change; do not invent placeholder references.

## YAML shape

Create the file with the top-level shape below if it does not exist. Prepend implemented changes under `changes`, preserving valid YAML and existing entries:

```yaml
schema_version: 1
purpose: "Agent-readable changelog of implemented project behavior."
changes:
  - id: "2026-10-09-github-prd-123"
    changed_at: "2026-10-09"
    version: "0.1.0"
    kind: "feature"
    title: "Feature name"
    status: "working"
    summary: "What changed and why it matters."
    areas:
      - "Affected domain or subsystem"
    working:
      - "Observable behavior that now works."
    limitations: []
    prd:
      issue: 123
      url: "https://github.com/ORG/REPO/issues/123"
    slices:
      - issue: 124
        title: "Slice title"
        type: "vertical"
        url: "https://github.com/ORG/REPO/issues/124"
    author:
      name: "Primary author"
      handle: "github-handle"
      type: "human"
    co_authors:
      - name: "Contributing agent or person"
        type: "agent"
    evidence:
      pull_requests: []
      commits: []
      tests: []
    archive:
      prd: "docs/Specs-Completed/123-feature/PRD.md"
      slices: []
```

Use one of these values:

- `kind`: `feature`, `fix`, `change`, `refactor`, `docs`, `infrastructure`, `deprecation`, or `removal`.
- `status`: `working`, `working_with_limitations`, `deprecated`, or `removed`.
- Slice `type`: `vertical` or `horizontal`.

Use `type: "human"` or `type: "agent"` for every author and co-author. Each co-author otherwise uses the same `name` and optional `handle` fields as `author`; omit an unverified handle rather than guessing it. Omit `version` for unversioned changes. Empty evidence or co-author lists are allowed only after checking the relevant sources. Quote strings that YAML could misinterpret, especially dates, hashes, handles, and issue-like identifiers.

After editing, parse the YAML with an available YAML parser. If none is installed, use a repository-provided validator; otherwise report that syntax validation could not be run.
