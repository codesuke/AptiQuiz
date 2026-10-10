# Spec: Template Enrichment

A spec never originates more than one new feature — it may touch or update multiple existing features, but only ever introduces one new one. Write in plain, terse, jargon-free English (ASD-STE100-lite): short sentences, no unnecessary hedging, no synonyms for the same concept within one document.

## Problem Statement

An agent writing a `Spec.md` has no place to record why it picked one implementation option over the alternatives, and no way to tell a reader "we decided against this" apart from "we haven't decided this yet" — `Out of Scope` conflates both. Separately, `Issue.md` still tells an agent to "reference the parent PRD," a name this repo stopped using when `Spec.md` was renamed from `PRD.md` (commit `99b0023`). Finally, a bug report has no template at all: an agent or contributor filing one has to invent the shape from scratch every time, with no guarantee they include the fields a triager actually needs (repro steps, expected vs. actual, environment).

## Solution

Enrich `docs/Templates/Spec.md` with a one-line Rationale bullet and a two-way split of `Out of Scope`. Fix `Issue.md`'s stale "PRD" reference to say "Spec." Add a new `docs/Templates/Bug.md` template, used when filing a bug as a GitHub Issue (this repo has no separate bug-tracking location — bugs live in the same issue tracker as everything else, per `docs/agents/issue-tracker.md`). `ADR.md` and `QnA.md` are left unchanged — research (`docs/Research/template-benchmark.md`) and the resolved decision ticket (issue #17) both found no gap in their current shape.

## User Stories

1. As an agent writing a `Spec.md`, I want a place to record why I chose this implementation option over the alternatives I considered, so that a future reader (human or agent) doesn't have to guess or re-derive the trade-off.
2. As an agent or reviewer reading a finished `Spec.md`, I want `Out of Scope` to separate "deliberately excluded" from "deferred, not yet decided," so that I don't mistake an open question for a closed one (or vice versa).
3. As an agent filling in `Issue.md`, I want the `Parent` section to say "Spec" instead of the stale "PRD," so that the template matches the rest of the repo's current vocabulary.
4. As an agent or contributor finding a bug, I want a `Bug.md` template with the standard repro-steps/expected/actual/environment shape, so that I file a report a triager can act on without reinventing the structure each time.
5. As a maintainer triaging a filed bug, I want every bug report to carry a `Status: needs-triage` line, so that it enters the same triage-label workflow (`docs/agents/triage-labels.md`) as every other issue in this tracker.
6. As a maintainer, I want `ADR.md` and `QnA.md` left untouched, so that stable, working templates aren't churned without a concrete gap driving the change.

## Implementation Decisions

- Decision: Add a one-line **Rationale** bullet under `Spec.md`'s `Implementation Decisions` section — why this option over the alternatives — borrowing the pattern from the Rust RFC template's `Rationale and alternatives` section, but kept to one line to match this repo's terse style rather than a full separate section.
  - Rationale: A separate section (Rust RFC's approach) is heavier ceremony than a one-line bullet needs to carry for specs this repo's size; a bullet under the existing section captures the same "why not the other way" signal at lower cost.
- Decision: Split `Spec.md`'s `Out of Scope` section into two labeled sub-bullet groups: **Deliberately excluded** (a considered and rejected option) and **Deferred** (an open question, not yet decided).
  - Rationale: `Out of Scope` currently conflates "we decided not to do this" with "we haven't decided yet." The Rust RFC template's separate `Unresolved questions` section proves the distinction is worth surfacing; folding it into two labeled groups within the existing section avoids adding an entirely new top-level section.
- Decision: In `Issue.md`, change the `Parent` section's line "Reference the parent PRD or issue, if any." to "Reference the parent Spec or issue, if any." No other line in `Issue.md` changes.
- Decision: Add `docs/Templates/Bug.md`, structured as: title, `Status: needs-triage` line, `Describe The Bug`, `Steps To Reproduce` (numbered), `Expected Behavior`, `Actual Behavior`, `Environment` (version/commit, OS/platform), `Additional Context`.
  - Rationale: This shape adapts GitHub's de-facto default bug-report template, trimmed to this repo's terse style and merged with `Issue.md`'s existing `Status:` convention. Dropped GitHub's OS/Desktop-vs-Smartphone environment split (not relevant here) and its mandatory screenshots field (folded into `Additional Context` instead); kept repro steps, expected-vs-actual, and environment as the load-bearing triage fields.
- Decision: A filed bug is a GitHub Issue using the `Bug.md` shape, not a file under a new `docs/Bugs/` folder — consistent with every other template in this repo feeding the same issue-tracker workflow.
- Decision: `ADR.md` and `QnA.md` are not modified by this spec. `ADR.md`'s existing `Considered Options` and `Consequences` sections already cover what the Rust RFC's `Drawbacks`/`Rationale and alternatives` sections provide, confirmed stable by comparison against ListItUp's identical template. `QnA.md` has no external reference template that maps cleanly onto a grill-session transcript, and ListItUp's copy is identical to this repo's.

## Testing Decisions

- This is a documentation-only change; there is no code seam to test. "Passing" means: the amended `Spec.md` and `Issue.md` read unambiguously, `Bug.md` exists and every field in it maps to a concrete triage need (no decorative fields), and none of the four template files gain ceremony disproportionate to their current terse style.
- Verification is a read-through against `docs/agents/code-quality.md`'s baseline and this repo's existing template style, plus a spot check that a filed `Bug.md`-shaped issue could carry a `needs-triage` label per `docs/agents/triage-labels.md` without modification.
- Prior art: this repo's own doc-only template changes ship without an automated test, verified by review alone (e.g. `docs/Specs-Planned/skill-provenance-flexibility.md`, and the `docs/Specs-Completed/` archive-format addition, commit `c4f3dfd`).

## Out of Scope

- Deliberately excluded: Changing `ADR.md` or `QnA.md` — research and the resolved decision ticket (issue #17) both found no gap in their current shape.
- Deliberately excluded: A new `docs/Bugs/` folder or any bug-tracking surface outside GitHub Issues — bugs use the same tracker as every other issue type in this repo.
- Deliberately excluded: GitHub's OS/Desktop-vs-Smartphone environment split, and a mandatory screenshots field, in `Bug.md` — overkill for a repo with no native/mobile targets; screenshots belong under `Additional Context` when relevant.
- Deferred: A `.github/ISSUE_TEMPLATE/` directory that surfaces `Bug.md` (and the other templates) as GitHub's native new-issue picker UI — this spec only adds the Markdown template file; wiring it into GitHub's issue-creation UI is a separate, not-yet-decided piece of work.
- Deferred: Any mechanism to detect when a filed bug or spec drifts out of the template's expected shape — not requested, no evidence it's needed yet.

## Further Notes

- Note: Settled during the `/grilling` + `/domain-modeling` decision session recorded in [issue #17](https://github.com/VirtuNode-dev/Starter-Pack/issues/17)'s resolution comment — no further investigation was needed before drafting this spec.
- Note: The `Bug.md` shape is drafted in full in [`docs/Research/template-benchmark.md`](../Research/template-benchmark.md)'s Recommendation section; this spec adopts it as-is.
- Note: Originates from wayfinder ticket ["Draft and publish the template-enrichment spec via to-spec"](https://github.com/VirtuNode-dev/Starter-Pack/issues/18), part of the ["Harden Starter-Pack"](https://github.com/VirtuNode-dev/Starter-Pack/issues/11) map.

## Build Summary

Shipped as three independent doc edits: `Spec.md` gained a Rationale sub-bullet and a Deliberately-excluded/Deferred Out-of-Scope split; `Issue.md`'s stale "PRD" reference became "Spec"; a new `Bug.md` template was added, adopted as-is from the research draft. `ADR.md` and `QnA.md` left untouched, as decided.

## Slice Log

- [#29 Enrich Spec.md with a Rationale bullet and Out-of-Scope split](https://github.com/VirtuNode-dev/Starter-Pack/issues/29) — commit `80d1003`.
- [#30 Fix Issue.md's stale PRD reference](https://github.com/VirtuNode-dev/Starter-Pack/issues/30) — commit `8e42278`.
- [#31 Add the Bug.md template](https://github.com/VirtuNode-dev/Starter-Pack/issues/31) — commit `032dc59`.

## Follow-Ups

- `Bug.md` isn't yet referenced from `AGENTS.md` or `docs/agents/issue-tracker.md` — an agent has no pointer telling it when to use `Bug.md` vs. plain `Issue.md`. Flagged in code review, not requested by any ticket, not fixed here.
- A `.github/ISSUE_TEMPLATE/` directory to surface these templates in GitHub's native issue picker — deferred by this spec's own Out of Scope.
