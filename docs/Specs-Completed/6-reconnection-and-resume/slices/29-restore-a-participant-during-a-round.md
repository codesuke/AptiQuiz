# Slice #29: Restore a Participant during a Round

- Parent PRD: [#6](https://github.com/codesuke/AptiQuiz/issues/6) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/29
- Slice type: Vertical
- Closed: 2026-10-10
- Commit: `332acd1`

## Acceptance-criteria result

All criteria met. A 5 s reconnect grace for early closure was added, because a refresh by an unanswered Participant closed the Round early for everyone (PRD #6 user story 2).

## Implementation summary

A Participant whose last socket drops during an open Round counts as connected for early closure for 5 s; a Question-bound re-check applies the normal rule afterwards. Resuming mid-Round returns the same Question, option order and ids, locked Answer, and deadline; after the reveal it returns the revealed view with a score equal to the Leaderboard total. The browser shows a live Score from each reveal.

## Verification evidence

`resume-round.test.ts` (9): grace hold and resume, grace expiry, no-op after close or advance, same order and deadline, locked Answer preserved, signed-in resume, repeated resume, post-reveal snapshot, next-Round delivery. Browser 11/11: mid-Round refresh keeps the locked Answer, order, and deadline; a signed-in refresh can still answer; the post-reveal Score is shown. See the PRD archive for full-suite results.

## Authorship

Codesuke <codesuke@gmail.com> (`332acd1`). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/6

## Slice type

Vertical

## What to build

A Participant who reconnects during a live Round receives the current public Question and their existing Answer and score state, then continues receiving Room events.

## Acceptance criteria

- [x] Resuming during an open Round returns the same Participant identity and score, current public Question, stable Participant-specific option order, already-answered state, and remaining time based on the Game Server deadline.
- [x] A pre-reveal snapshot contains no correct option or explanation. A snapshot after reveal reflects the revealed phase and current public results.
- [x] Resume does not reset or extend the Round deadline, reopen an accepted Answer, change a score, or add a duplicate Participant to the roster.
- [x] A resumed Participant receives subsequent Room events. Repeating the resume after a lost acknowledgement does not alter the Room or Participant state.
- [x] A Guest and a signed-in Participant can each refresh during a Round and continue from the same Participant identity; the signed-in connection still uses a fresh Socket Ticket.

## Test seam

Socket.IO disconnect and resume before and after Round reveal, with controlled server time, plus a browser refresh during an open Round.
