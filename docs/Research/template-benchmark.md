# Template Benchmark

Research for [issue #16](https://github.com/VirtuNode-dev/Starter-Pack/issues/16). Compares Starter-Pack's `docs/Templates/` against ListItUp's equivalent docs and two external reference templates, to feed a downstream decision ticket on improving Spec/ADR/QnA/Issue and adding a Bug template. This is evidence, not a decision.

## Sources

- Starter-Pack baseline: `docs/Templates/Spec.md`, `ADR.md`, `QnA.md`, `Issue.md` (this repo, read directly).
- ListItUp: [AGENTS.md](https://github.com/VirtuNode-dev/ListItUp/blob/main/AGENTS.md), [docs/Templates/PRD.md](https://github.com/VirtuNode-dev/ListItUp/blob/main/docs/Templates/PRD.md), [ADR.md](https://github.com/VirtuNode-dev/ListItUp/blob/main/docs/Templates/ADR.md), [QnA.md](https://github.com/VirtuNode-dev/ListItUp/blob/main/docs/Templates/QnA.md), [Issue.md](https://github.com/VirtuNode-dev/ListItUp/blob/main/docs/Templates/Issue.md). Fetched via `gh api`/raw GitHub, 2026-08-07. ListItUp has no `.github/ISSUE_TEMPLATE` and no Bug template either — same gap Starter-Pack has.
- External reference 1 — GitHub's de-facto default bug report template (the stock scaffold GitHub generates for `.github/ISSUE_TEMPLATE/bug_report.md`), confirmed via a still-unmodified copy at [SuperBruceJia/EEG-DL](https://github.com/SuperBruceJia/EEG-DL/blob/master/ISSUE_TEMPLATE/bug_report.md).
- External reference 2 — [Rust RFC template](https://github.com/rust-lang/rfcs/blob/master/0000-template.md) (`rust-lang/rfcs`), a well-known RFC-style spec format.

## What ListItUp actually has

ListItUp is explicitly "still under active development" per the ticket — treated as one input, not a gold standard. Its templates are near-identical to Starter-Pack's, which makes sense: both descend from the same skill-pipeline lineage. Differences found:

- **`PRD.md` vs `Spec.md`**: ListItUp still calls it `PRD.md`; Starter-Pack renamed to `Spec.md` (per commit `99b0023`) but its own `Issue.md` still says "Reference the parent PRD or issue" — the known stale reference the ticket flags as out of scope here.
- **ADR.md, QnA.md, Issue.md**: byte-for-byte identical in structure to Starter-Pack's current versions. No new fields, no extra sections.
- **AGENTS.md** has a few working rules Starter-Pack's doesn't (project-specific, not template-relevant): a "go ahead" continuation rule, a pointer to `sample.html` as a design reference, and a Prisma-schema-is-source-of-truth data rule. Nothing here is a templating pattern to port.
- No Bug report template, no `.github/ISSUE_TEMPLATE/` directory. Same gap as Starter-Pack.

Conclusion: ListItUp offers no new structural patterns for Spec/ADR/QnA/Issue, and confirms the Bug template gap is shared, not Starter-Pack-specific.

## External reference 1: GitHub's default bug report template

```
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Desktop (please complete the following information):**
 - OS: [e.g. iOS]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.
```

Structure worth noting: **Describe → Reproduce (numbered steps) → Expected → Actual/Evidence → Environment → Additional context**. This is the industry-standard skeleton for bug reports — every field earns its place for triage (repro steps let anyone reproduce; environment rules out platform-specific causes). The "Desktop/Smartphone" environment split is overkill for most repos including this one.

## External reference 2: Rust RFC template

Sections: `Summary → Motivation → Guide-level explanation → Reference-level explanation → Drawbacks → Rationale and alternatives → Prior art → Unresolved questions → Future possibilities`, plus a frontmatter block (`Feature Name`, `Start Date`, `RFC PR`, tracking issue).

Useful patterns even at Starter-Pack's smaller scale:
- **Drawbacks** and **Rationale and alternatives** as separate, named sections — forces the author to argue against their own proposal and show what else was considered, not just assert the chosen design. Starter-Pack's `Spec.md` has no equivalent; only `Implementation Decisions` (states the choice, not the trade-off).
- **Unresolved questions** — separates "still open, will resolve before/after merge" from "Out of Scope" (permanently excluded). Starter-Pack's `Spec.md` only has `Out of Scope`, which conflates "we decided not to do this" with "we haven't decided yet."
- The rest (Guide-level vs Reference-level explanation split, frontmatter, future-possibilities) is heavier ceremony than a terse agent-repo needs — RFCs go through multi-week public review; Starter-Pack specs don't.

## Recommendation

Evidence-based, not prescriptive — keep every addition optional/one-line to match the repo's existing terse style. A downstream ticket should decide what actually lands.

**`Spec.md`**
- Consider adding a one-line **Rationale** bullet under `Implementation Decisions` (why this option over the alternatives), borrowing the RFC pattern without a full separate section — cheaper than Rust's split sections but captures the same "why not the other way" signal that's currently missing.
- Consider splitting `Out of Scope` into two lines: **Deliberately excluded** vs **Deferred** (open question, not yet decided) if agents keep conflating them in practice — otherwise skip, YAGNI.

**`ADR.md`**
- No change indicated. It already has `Considered Options` and `Consequences`, which covers what Rust RFC's `Drawbacks`/`Rationale and alternatives` provide, just terser. ListItUp confirms this shape is stable across repos.

**`QnA.md`**
- No change indicated. ListItUp is identical; no external reference template maps cleanly onto a grill-session format.

**`Issue.md`**
- No change indicated by this research (the "PRD" stale reference is a separate, already-known fix, not addressed here).

**New `Bug.md` template** — adapt GitHub's default, trimmed to this repo's terse style and merged with the existing `Issue.md` conventions (`Status:` line, checkbox-style where useful):

```markdown
# {Bug Title}

Status: needs-triage

## Describe The Bug

What's wrong, in one or two sentences.

## Steps To Reproduce

1. Step
2. Step

## Expected Behavior

What should have happened.

## Actual Behavior

What happened instead.

## Environment

- Version/commit:
- OS/platform:

## Additional Context

- Note:
```

Kept: repro steps, expected vs actual, environment (all load-bearing for triage). Dropped: GitHub's OS/Desktop-vs-Smartphone split (not relevant unless the project ships native/mobile), screenshots as a mandatory field (make it part of Additional Context instead). Added: `Status:` line to match `Issue.md`'s triage-label convention already in use.
