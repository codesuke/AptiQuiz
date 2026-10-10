# Wire the matt-pocock skill pipeline for Starter-Pack

Spec: https://github.com/VirtuNode-dev/Starter-Pack/issues/4 (closed)
Wayfinder map: [Wire the matt-pocock skill pipeline for Starter-Pack](https://github.com/VirtuNode-dev/Starter-Pack/issues/2)

## Problem Statement

Starter-Pack's docs and skill references have drifted from what's actually usable. AGENTS.md points at `to-issues`, but the vendored skill is `to-tickets`. It points at `to-prd`-shaped conventions, but the vendored skill is `to-spec`. `to-questionnaire`, `implement`, and `grill-with-docs` are used by name in AGENTS.md's workflow but never listed as tools an agent should reach for. There's no agreed place to file a wayfinder session log or a questionnaire, so they'd land loose in the repo root. The PRD template has no rule stopping a spec from smuggling in a second, unrelated feature, and no writing-style guidance, so specs drift long and jargon-heavy over time. And `docs/Specs-Completed/` has no defined shape, so archived specs carry no record of what actually got built or how — the historical record is empty by default.

## Solution

Bring AGENTS.md and the `docs/` scaffold in line with the skills actually vendored in this repo, and close the two gaps a first-time user of the template would hit immediately: nowhere to file a wayfinder log or a questionnaire, and no discipline on spec scope, spec prose, or spec archival.

1. **AGENTS.md** references the real vendored skills (`to-spec`, `to-tickets`, `to-questionnaire`, `implement`, `grill-with-docs`) instead of the deprecated `to-prd`/`to-issues`, and states the vertical-default slicing convention (with its contract-gated horizontal exception) next to the `to-tickets` reference.
2. **`docs/sessions/`** and **`docs/questionnaire/`** exist as folders with a README each, documenting their naming convention and, for sessions, that they're written on request only.
3. **`docs/Templates/Spec.md`** (renamed from `PRD.md`) carries two new rules: one spec never originates more than one new feature, and specs are written in plain, terse, jargon-free English (ASD-STE100-lite, a style preference, not literal controlled-vocabulary enforcement).
4. **`docs/Specs-Completed/README.md`** defines the archive format (build summary, slice log, follow-ups) and the trigger: once every slice/sub-issue of a spec is closed, close the spec, fill in the archive section, and move a copy here.

## User Stories

1. As an agent picking up this repo cold, I want AGENTS.md to name the skills that are actually installed, so that I don't try to invoke a skill that doesn't exist or is stale.
2. As the repo owner, I want a fixed place to file a wayfinder session log, so that past charting sessions are easy to find later without cluttering the repo root.
3. As the repo owner, I want a fixed place to file a `to-questionnaire` output, so that questionnaires sent to collaborators are easy to find and don't clutter the repo root.
4. As an agent drafting a spec, I want an explicit rule that a spec covers exactly one new feature, so that I don't bundle unrelated work into a single spec by default.
5. As an agent drafting a spec, I want a plain-English style rule, so that specs stay short and readable instead of accumulating jargon and hedging over time.
6. As an agent slicing a spec with `to-tickets`, I want the vertical-default convention and its narrow horizontal exception stated in AGENTS.md, so that I don't re-litigate horizontal vs. vertical slicing from scratch on every feature.
7. As the repo owner, I want closed specs archived with a record of what was built and how, so that `docs/Specs-Completed/` is a useful historical reference instead of an empty folder.
8. As an agent finishing a feature, I want a clear trigger for when to close and archive a spec, so that I don't leave a finished spec open indefinitely or archive it prematurely mid-slice.
9. As a team member on a project built from this template, I want a sanctioned way to split a feature by layer (frontend/backend) when the layer contract is already locked, so that specialists can work in parallel without abandoning the safety vertical slicing gives.

## Implementation Decisions

- **AGENTS.md — Preferred Skill Workflow section**: replace the `to-issues` reference with `to-tickets`; replace the implicit `to-prd` framing with `to-spec`; add `to-questionnaire` and `implement` as named skills in the workflow list; keep `grill-with-docs` documented as the existing alias for `grilling` + `domain-modeling`. Add a slicing rule next to the `to-tickets` reference: **default to vertical slices** (tracer-bullet, end-to-end, independently demoable — matches `to-tickets`' own philosophy). **Horizontal-by-layer splitting is a named exception**, allowed only once the contract between layers is already locked (an API shape, a schema, a prop interface — decided via an ADR, a prototype, or an earlier slice). When it applies, structure it the same way `to-tickets` already structures a wide refactor: one ticket that pins the contract, blocking N parallel per-layer tickets, all blocking a single integration ticket — that integration ticket is the only place the slice is actually verified end-to-end. Do not treat horizontal as a free per-feature judgment call; it only fires once a contract is genuinely locked.
- **AGENTS.md — skill provenance sentence**: update "these skills are installed globally and are not part of this repo" to reflect that the skill suite is vendored in-repo (`.agents/skills/`, `.claude/skills/`, `skills-lock.json`), per ADR 0002, and refreshed via `npx skills update`.
- **`docs/sessions/README.md`** (new folder + file): document the naming convention `YYYY-MM-DD_HHMM_<objective-slug>.md`, and state explicitly that a session is logged here only when the user asks for it — not automatically at the end of every wayfinder session.
- **`docs/questionnaire/README.md`** (new folder + file): document that `to-questionnaire` output lands here as `<slug>.md` (already wired into the vendored skill directly — see ADR 0002's follow-on edit), with no date prefix, since a questionnaire is a decision artifact, not a session log.
- **`docs/Templates/PRD.md` → `docs/Templates/Spec.md`**: rename, matching `to-spec`'s vendored template exactly (Problem Statement / Solution / User Stories / Implementation Decisions / Testing Decisions / Out of Scope / Further Notes). Add two rules at the top of the file: (1) a spec never originates more than one new feature — it may touch or update multiple existing features, but only ever introduces one new one; (2) write in plain, terse, jargon-free English — short sentences, no unnecessary hedging, no synonyms for the same concept within one document.
- **`docs/Specs-Planned/README.md`**: update its link from `PRD.md` to `Spec.md`.
- **`docs/Specs-Completed/README.md`**: add a required archive section appended to a spec before it moves here: a **Build Summary** (what shipped, 2-3 sentences), a **Slice Log** (one line per closed sub-issue — title, link, and a short note on what it touched, not a full diff), and **Follow-Ups** (known gaps or deferred work, or "None"). State the trigger: move a spec here once every one of its sub-issues is closed, not before.

## Testing Decisions

This is a documentation-and-convention change with no application code, so "testing" means verifying each artifact exists and reads correctly rather than running an automated suite:

- Each of the 4 seams (AGENTS.md, docs/sessions + docs/questionnaire, Spec.md, Specs-Completed/README.md) is independently checkable: does the file exist at the right path, does it say what this spec says it should.
- Prior art: `docs/QnA/README.md`, `docs/ADR/README.md`, `docs/Specs-Planned/README.md` are the existing short-README convention this repo already uses for docs subfolders — new READMEs should match that tone and length, not add ceremony.
- No behavior in this repo is invoked by test code; the check is "an agent reading these docs cold does the right thing," which is verified by re-reading the finished files, not a test runner.

## Out of Scope

- Automated stack-selection or file-pruning tooling (removing stack-irrelevant files once a real project's stack is chosen) — separate future effort; `BOOTSTRAP.md`'s manual checklist already covers this.
- Actually running a real end-user project through the spec → slice → implement → archive pipeline on a chosen stack — no project/stack exists yet; that's the template's next use, not this spec's job.
- A repo-level override note for `to-questionnaire`'s output path — already resolved by editing the vendored skill file directly (see ADR 0002), not by a separate doc.
- Deleting the stale `to-prd`/`to-issues` skills from the user's global `~/.claude/skills/` — that's a global, cross-repo cleanup decision outside this repo's scope.

## Further Notes

- This spec is itself the first real exercise of the pipeline it describes: once published, it should be sliced with `to-tickets` (native GitHub sub-issues, vertical by default), each slice implemented, and the spec closed and archived into `docs/Specs-Completed/` using the very format it defines — dogfooding by construction. This spec's own 4 seams have no locked inter-layer contract between them, so they slice vertically as-is — the horizontal exception doesn't apply here; it's a convention for future feature work in projects built from this template.
- Originates from [wayfinder map "Wire the matt-pocock skill pipeline for Starter-Pack"](https://github.com/VirtuNode-dev/Starter-Pack/issues/2), ticket [Draft and publish the skill-pipeline spec via to-spec](https://github.com/VirtuNode-dev/Starter-Pack/issues/3).



## Build Summary

Shipped in 5 commits on `main`: vendored the mattpocock skill suite in-repo, fixed AGENTS.md and docs/README.md's stale skill references, scaffolded docs/sessions/ and docs/questionnaire/, renamed the PRD template to Spec.md with its two new rules, and defined the Specs-Completed archive format. A `code-review` pass (Standards + Spec axes) caught and fixed a heading-case mismatch, a doc file outside the original 4-seam scope with the same stale references, and drift-risk from restating rules in two places.

## Slice Log

- [Fix AGENTS.md skill references and document the slicing convention](https://github.com/VirtuNode-dev/Starter-Pack/issues/6) — AGENTS.md's Preferred Skill Workflow list + docs/README.md's Operating Model, both fixed.
- [Scaffold docs/sessions/ and docs/questionnaire/ with naming-convention READMEs](https://github.com/VirtuNode-dev/Starter-Pack/issues/7) — two new folders, each with a README.
- [Rename docs/Templates/PRD.md to Spec.md and add the single-feature + plain-English rules](https://github.com/VirtuNode-dev/Starter-Pack/issues/8) — template renamed, two rules added, docs/Specs-Planned/README.md link updated.
- [Define the docs/Specs-Completed archive format and trigger](https://github.com/VirtuNode-dev/Starter-Pack/issues/9) — this very archive format, documented in docs/Specs-Completed/README.md.

## Follow-Ups

- The stale `to-prd`/`to-issues` skills still exist in the user's global `~/.claude/skills/` (out of scope for this repo — a cross-repo cleanup decision).
- No real project has yet been built from this template using the pipeline this spec wires up — the first real use will be the actual proving ground beyond this dogfooding exercise.
