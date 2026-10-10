# Slice #61: Bring motion to the live Room

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/61
- Slice type: Vertical
- Parent PRD: [#57](https://github.com/codesuke/AptiQuiz/issues/57)
- Commits: 73f1b5d
- Status: implemented and closed

## Acceptance-criteria result

The observable behavior in this slice is implemented and covered by the verification below. Browser inspection remains an open verification gap for motion and sound in #61 and #62.

## Implementation summary

Live phase transitions, roster changes, answer lock, reveal, rank movement, final three-second pulses, and finish now use Framer Motion. Content remains visible and actionable, reduced motion is respected, and narrow layouts have room to shrink.

## Verification evidence

Web lint, typecheck, 194 tests, and build passed. Browser-driven desktop, mobile, and reduced-motion inspection was unavailable because no browser runtime is installed.

## Authorship

Derived from implementation commit authors: Codesuke <codesuke@gmail.com>. The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/57

## Slice type

Vertical

## What to build

Purposeful motion makes roster changes, answer lock, reveal, rank movement, ready transitions, and the finish legible in the live Room.

## Acceptance criteria

- [ ] Each specified live state change provides clear visible feedback for Host or Participant as applicable.
- [ ] No motion delays an open Question, blocks Answer input, or hides correct information or results.
- [ ] Reduced-motion preference removes nonessential animation while preserving visible state changes.
- [ ] Desktop and mobile layouts remain readable and use the existing AptiQuiz visual language.

## Test seam

Browser-driven live Room checks at desktop/mobile and reduced-motion settings, plus focused behavior tests for state transitions where needed.
