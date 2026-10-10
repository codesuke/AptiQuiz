# Slice #59: Run Questions automatically after each reveal

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/59
- Slice type: Vertical
- Parent PRD: [#57](https://github.com/codesuke/AptiQuiz/issues/57)
- Commits: 4f92b6f
- Status: implemented and closed

## Acceptance-criteria result

The observable behavior in this slice is implemented and covered by the verification below. Browser inspection remains an open verification gap for motion and sound in #61 and #62.

## Implementation summary

The Game Server holds reveal for 6 seconds, then starts the next 3-second ready phase and Question automatically. The Host advance command is refused and its control was removed. Timer races, early closure, and reconnect state are covered.

## Verification evidence

Public multi-Round Socket.IO tests with an injected clock and scheduler passed. Full lint, typecheck, test, and build passed after this slice.

## Authorship

Derived from implementation commit authors: Codesuke <codesuke@gmail.com>. The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/57

## Slice type

Vertical

## What to build

The Game Server runs nonfinal Rounds without Host advancement: a closed Question reveals for 6 seconds, then Getting ready shows for 3 seconds, then the next Question opens. Both viewers see each phase countdown.

## Acceptance criteria

- [ ] Deadline and existing all-connected-answered closure still reveal once; reconnect grace, scoring, and answer secrecy remain unchanged.
- [ ] The reveal contains the correct option and cumulative Leaderboard for a server-timed 6 seconds.
- [ ] A 3-second Getting ready screen follows each nonfinal reveal, then the next Question opens with a fresh 30-second server deadline.
- [ ] A Host cannot move, skip, or open a Question manually; the advance control and command are removed or refused.
- [ ] Host and Participant reconnects during reveal or Getting ready recover the same phase and deadline.
- [ ] Timer races and duplicate callbacks do not create duplicate Rounds or alter scores.

## Test seam

Public multi-Round Socket.IO flow with injected clock and scheduler, including early closure, reconnect, duplicate callbacks, and refused manual advancement.
