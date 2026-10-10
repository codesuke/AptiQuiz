# Slice #74: Reframe the active Participant Room around the Question

Issue: https://github.com/codesuke/AptiQuiz/issues/74
Slice type: Vertical

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/73

## Slice type

Vertical

## What to build

Rearrange active Participant Room phases so the quiz area remains primary and Room facts plus a constrained, scrollable Participant roster appear below it without any Host utilities.

## Acceptance criteria

- [ ] Getting-ready, Question, and reveal phases no longer use the wide desktop utility sidebar.
- [ ] Room facts and the Participant roster appear below the quiz area and stack in the same reading order on mobile.
- [ ] The roster retains its Participant count, displays approximately six to eight compact rows, then scrolls accessibly.
- [ ] No QR code, sharing controls, or Host actions appear in the Participant view.
- [ ] Open-Question answer behavior and its secrecy boundary remain unchanged.
- [ ] Desktop and 390px mobile layouts preserve visible focus, reduced-motion behavior, and no horizontal overflow.

## Test seam

The Participant live Room view supplied with getting-ready, open-Question, and reveal fixtures.

## Result

All acceptance criteria met. Implemented in commit 4f40aed. Tests: `lobby/participant-room-view.test.tsx`. Author: Codesuke.
