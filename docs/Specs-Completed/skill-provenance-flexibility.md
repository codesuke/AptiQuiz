# Spec: Skill Provenance Flexibility

A spec never originates more than one new feature — it may touch or update multiple existing features, but only ever introduces one new one. Write in plain, terse, jargon-free English (ASD-STE100-lite): short sentences, no unnecessary hedging, no synonyms for the same concept within one document.

## Problem Statement

AGENTS.md tells an agent that Starter-Pack vendors its skill suite in-repo (`.agents/skills/`, `.claude/skills/`, `skills-lock.json`) "rather than relying solely on each machine's global install" (see [ADR 0002](../ADR/0002-vendor-skill-suite.md)). Read on its own, that sentence reads as a soft mandate: prefer the vendored copy. It does not say an agent may reach for the globally-installed copy (`~/.claude/skills/`) when that fits the situation better — for example, a skill that exists globally but was never vendored, or a newer skill version needed before the next `npx skills update` refresh. The user problem: an agent following AGENTS.md as written has no explicit permission to pick whichever copy fits, and might avoid the global copy even when it is the right call.

## Solution

State explicitly in AGENTS.md that Starter-Pack skills may be invoked from either the vendored in-repo copy or the globally-installed copy, whichever fits the situation at hand — there is no strict mandate to prefer one over the other. This does not change why Starter-Pack vendors skills (that is [ADR 0002](../ADR/0002-vendor-skill-suite.md)'s call, left as-is); it only clarifies which copy an agent may invoke at the point of use.

## User Stories

1. As an agent working in a Starter-Pack-derived repo, I want AGENTS.md to say explicitly that I may invoke a skill from either the vendored or the global copy, so that I don't default to only the vendored copy out of an unstated assumption.
2. As an agent needing a skill that exists globally but was never vendored into this repo, I want AGENTS.md to confirm that's an expected, sanctioned case, so that I don't treat it as a deviation from repo convention.
3. As a developer maintaining Starter-Pack, I want the vendoring rationale (ADR 0002: reproducible, pinned versions for a team) kept separate from the invocation-flexibility rule, so that loosening the invocation rule later doesn't require reopening or amending the ADR.

## Implementation Decisions

- Decision: Amend the skill-provenance sentence in `AGENTS.md` (the paragraph below the "Preferred Skill Workflow" list, currently ending "...rather than relying solely on each machine's global install") to add an explicit, one-line carve-out: agents may invoke a skill from either the vendored copy or the global `~/.claude/skills/` install, whichever fits the situation — no strict mandate either way.
- Decision: Do not amend [ADR 0002](../ADR/0002-vendor-skill-suite.md). It answers a different question (why the repo vendors skills at all: pinned, reproducible versions for a team) than this spec answers (which copy an agent invokes at the point of use). The two are compatible, not in tension, so no amendment note is needed there.
- Decision: This is a documentation-only change. No code, schema, or API surface is touched.

## Testing Decisions

- This is a docs-only change; there is no code seam to test. "Passing" means the amended AGENTS.md sentence reads unambiguously and does not contradict ADR 0002.
- Verification is a read-through: confirm the new sentence states the flexibility explicitly, confirm it doesn't remove or contradict the existing vendoring rationale, and confirm ADR 0002 still stands unchanged and accurate.
- Prior art: this repo's own doc-only changes (e.g. the `docs/Specs-Completed/` archive-format addition, commit `c4f3dfd`) ship without an automated test, verified by review alone.

## Out of Scope

- Item: Deciding whether to vendor skills at all — already decided by ADR 0002, not reopened here.
- Item: Changing `skills-lock.json`, `.agents/skills/`, or `.claude/skills/` contents — this spec touches guidance text only.
- Item: A mechanism to detect or warn when the vendored and global copies of a skill have diverged — not requested, no evidence it's needed yet.

## Further Notes

- Note: Settled during the destination-naming session for the wayfinder map ["Harden Starter-Pack: skill provenance, domain conventions, and templates"](https://github.com/VirtuNode-dev/Starter-Pack/issues/11) — no further investigation was needed before drafting this spec.
- Note: Originates from wayfinder ticket ["Draft and publish the skill-provenance spec via to-spec"](https://github.com/VirtuNode-dev/Starter-Pack/issues/12).

## Build Summary

Shipped as a single-sentence carve-out appended to AGENTS.md's skill-provenance paragraph: an agent may invoke a skill from either the vendored (`.agents/skills/`, `.claude/skills/`) or globally-installed (`~/.claude/skills/`) copy, whichever fits. ADR 0002 was left unchanged, as decided.

## Slice Log

- No `to-tickets` slicing — the change was small enough (one sentence) to implement directly. Ticket ["Slice Spec: Skill Provenance Flexibility via to-tickets"](https://github.com/VirtuNode-dev/Starter-Pack/issues/25) was closed noting the direct implementation instead.

## Follow-Ups

- None.
