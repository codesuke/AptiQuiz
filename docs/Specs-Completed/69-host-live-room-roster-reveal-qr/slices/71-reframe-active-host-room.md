## Final issue snapshot

# Reframe the active Host Room around the Question

https://github.com/codesuke/AptiQuiz/issues/71

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/69

## Slice type

Vertical

## What to build

Rearrange active Host Room phases so the Question remains primary and a below-Question utility row contains a compact QR-based Room details panel and a constrained, scrollable Participant roster.

## Acceptance criteria

- [ ] Getting-ready, Question, and reveal phases no longer use a narrow desktop Participant roster rail.
- [ ] The Participant roster retains its count, displays approximately six to eight compact rows, then scrolls accessibly.
- [ ] An active Room details panel shows the QR code and the message “Match in progress — joining is closed.”
- [ ] The Lobby retains its existing sharing treatment and completed Results omit the active-match QR panel.
- [ ] Desktop and 390px mobile layouts preserve reading order, visible focus, reduced-motion behavior, and no horizontal overflow.

## Test seam

The Host live Room view supplied with phase-specific Room data.

## Result

- Status: closed; all acceptance criteria met.
- Commit: d1277c1
- Implementation: New HostRoomView/HostActiveRoom: Question first, reveal standings card, utility row with JoinQr Room details ('Match in progress — joining is closed.') and a ~7-row scrollable, focusable roster. Lobby sharing kept; Results omit the QR panel.
- Verification: Web suite 206 tests, typecheck, Biome pass; fixture render screenshotted at 1440px and 390px with no horizontal overflow.
- Author: Codesuke (@codesuke), human. Co-authors: none.
