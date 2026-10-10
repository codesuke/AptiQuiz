# Slice #28: Resume a Participant in the Lobby

- Parent PRD: [#6](https://github.com/codesuke/AptiQuiz/issues/6) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/28
- Slice type: Vertical
- Closed: 2026-10-10
- Commit: `95ff9ec`

## Acceptance-criteria result

All criteria met.

## Implementation summary

Joining returns an opaque Resume Token: base64url HMAC-SHA256 of `resume:<roomId>:<participantId>`, keyed by `GAME_SERVER_SECRET`. Only the joiner's acknowledgement carries it. The server keeps its SHA-256 hash in memory and in `Participant.resumeTokenHash`; the Game Server chooses the Participant id before the write. `room:resume {joinCode, resumeToken}` reclaims the same Participant on a new connection and returns the Lobby, the current Round view, and the revealed score. It adds no Participant, uses no place, and broadcasts nothing. A User-bound token works only for that User. Malformed, unknown, and other-Room tokens get `invalid_resume_token`. The browser keeps the token in `localStorage`, resumes on every connect, and retries a lost acknowledgement at most 5 times.

## Verification evidence

`resume.test.ts` (12): token issue, no token in events or logs, Guest and User resume, foreign-User refusal, malformed/unknown/other-Room refusals, no reclaim by name, repeated resume, a full 50-Participant Room, early-closure tracking, revealed-only score, and the FINISHED phase. Database `recordParticipant` id/hash test. Browser: Guest and signed-in Lobby refresh, no extra rows, single roster entry. See the PRD archive for full-suite results.

## Authorship

Codesuke <codesuke@gmail.com> (`95ff9ec`). The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/6

## Slice type

Vertical

## What to build

A Guest or signed-in Participant can refresh in the Lobby and return to the same Room identity, with an authoritative Lobby snapshot and no duplicate Participant.

## Acceptance criteria

- [x] Joining a Room issues an opaque Resume Token bound to that Room and Participant. The browser keeps the token locally; the server stores only its hash and does not put the token in Room broadcasts, URLs, or logs.
- [x] A Guest can disconnect and resume into the same Participant identity and Lobby roster. A signed-in Participant can do the same after obtaining a fresh Socket Ticket.
- [x] The resume response contains the current Lobby phase, Room roster, Participant identity, and score. The resumed connection receives later Room events.
- [x] Resume does not add a Participant, consume another place in the 50-Participant limit, or broadcast a second join. A repeated resume after a lost acknowledgement leaves one Participant identity.
- [x] Malformed, unknown, and wrong-Room Resume Tokens are refused without exposing another Participant's state. A display name or Join Code alone cannot reclaim a Participant.

## Test seam

Join, disconnect, and `room:resume` through the running Game Server's Socket.IO interface, followed by a browser refresh as a Guest and a signed-in Participant.
