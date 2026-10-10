# Issue Tracker: GitHub

Issues and PRDs for this repo live as GitHub Issues. Use the `gh` CLI for issue operations.

## Repository

`codesuke/AptiQuiz`

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments`
- List issues: `gh issue list --state open --json number,title,body,labels,comments`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply a label: `gh issue edit <number> --add-label "..."`
- Remove a label: `gh issue edit <number> --remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` should do this automatically inside the clone.

## Planning And Archive Boundary

GitHub Issues are the sole source of truth for planned and active PRDs/specs and slices. Do not create local planning copies. After all slices are implemented and verified, `/implement-spec` snapshots the completed PRD and slice issues under `docs/Specs-Completed/` and `/record-build` updates `docs/build-memory.yaml`.

## When A Skill Says "Publish To The Issue Tracker"

Create a GitHub issue and apply the appropriate triage label from `docs/agents/triage-labels.md`.

## When A Skill Says "Fetch The Relevant Ticket"

Run `gh issue view <number> --comments`.

## Native Relationship Primitives

Shared mechanics behind every parent/sub-issue and blocking relationship in this repo — used by both `wayfinder` and `to-tickets`. This repo has native support confirmed for both relationship types; use them instead of body-text conventions.

- **Get a node id**: `gh api graphql -f query='query { repository(owner:"codesuke", name:"AptiQuiz") { issue(number: <n>) { id } } }'`
- **Link a sub-issue to a parent** (there is no `gh issue create --parent` flag yet): `gh api graphql -f query='mutation { addSubIssue(input: {issueId: "<parent node id>", subIssueId: "<sub-issue node id>"}) { subIssue { id } } }'`
- **Add a blocking dependency** (renders as "blocked by" in the GitHub UI): `gh api -X POST repos/codesuke/AptiQuiz/issues/<blocked_number>/dependencies/blocked_by -f issue_id=<blocking_issue_node_id>`
- **Check blocking status**: `gh api repos/codesuke/AptiQuiz/issues/<number>/dependencies/blocked_by`

## Wayfinding Operations

For the `wayfinder` skill's map/ticket mechanics:

- **Map**: a GitHub issue labeled `wayfinder:map`.
- **Tickets**: native sub-issues of the map — link with the "Link a sub-issue to a parent" primitive above.
- **Ticket type**: one `wayfinder:research` / `wayfinder:prototype` / `wayfinder:grilling` / `wayfinder:task` label per ticket.
- **Blocking**: use the "Add a blocking dependency" primitive above.
- **Claim**: `gh issue edit <number> --add-assignee @me`.
- **Frontier query**: open, unassigned sub-issues of the map with no open `blocked_by` — check each candidate with the "Check blocking status" primitive above.

## Ticket Sub-Issue Linking (to-tickets)

When `to-tickets` publishes slices for a PRD/spec issue, link each published ticket to that parent with the "Link a sub-issue to a parent" primitive above — the PRD is the parent node id and each slice is a sub-issue node id. Wire blocking edges between slices with the "Add a blocking dependency" primitive above. Apply the `ready-for-agent` triage label per `docs/agents/triage-labels.md`. The issue body must declare the slice type as `Vertical` or `Horizontal`.
