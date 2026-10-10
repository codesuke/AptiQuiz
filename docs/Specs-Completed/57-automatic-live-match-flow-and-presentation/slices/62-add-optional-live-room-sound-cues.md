# Slice #62: Add optional live Room sound cues

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/62
- Slice type: Vertical
- Parent PRD: [#57](https://github.com/codesuke/AptiQuiz/issues/57)
- Commits: 1301f23
- Status: implemented and closed

## Acceptance-criteria result

The observable behavior in this slice is implemented and covered by the verification below. Browser inspection remains an open verification gap for motion and sound in #61 and #62.

## Implementation summary

Short synthesized Web Audio cues mark the final three seconds, answer lock, reveal, and finish. The visible, keyboard-accessible mute control remembers its setting. Audio is interaction-gated, deduplicated across reconnects and rerenders, and errors do not interrupt play.

## Verification evidence

Focused audio controller and event mapping tests passed. Web typecheck, 197 tests, build, and targeted Biome passed. Browser playback inspection was unavailable because no browser runtime is installed.

## Authorship

Derived from implementation commit authors: Codesuke <codesuke@gmail.com>. The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/57

## Slice type

Vertical

## What to build

Short optional audio cues accompany the final three countdown seconds, answer lock, reveal, and final results; a visible mute control persists its setting.

## Acceptance criteria

- [ ] No sound plays before viewer interaction; no background music plays.
- [ ] Short cues play at the specified events while unmuted, without repeated cues on reconnect or rerender.
- [ ] Correctness-specific sound plays only after reveal; every cue has a visible equivalent.
- [ ] Mute is keyboard accessible, visible in the live Room, and remembered across refresh.
- [ ] Sound failures or unavailable audio APIs never interrupt play.

## Test seam

Focused web event-to-cue and persistence tests with a stub audio output, plus browser checks of control accessibility and no autoplay.
