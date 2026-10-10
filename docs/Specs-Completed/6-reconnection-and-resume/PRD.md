# PRD #6: Reconnection & Resume

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/6
- Archived: 2026-10-10
- Status: all slices implemented, verified, and closed. The PRD issue was closed with the archive.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#28](https://github.com/codesuke/AptiQuiz/issues/28) | Resume a Participant in the Lobby | Vertical | [slice](slices/28-resume-a-participant-in-the-lobby.md) |
| [#29](https://github.com/codesuke/AptiQuiz/issues/29) | Restore a Participant during a Round | Vertical | [slice](slices/29-restore-a-participant-during-a-round.md) |

## Build summary

- **Resume Token (#28).** Joining returns an opaque, 256-bit Resume Token derived as HMAC-SHA256 of `resume:<roomId>:<participantId>`, keyed by `GAME_SERVER_SECRET`. A join retried after a lost acknowledgement gets the same token without plaintext storage. Only its SHA-256 hash is kept, in memory and in `Participant.resumeTokenHash`. The token appears only in the joiner's acknowledgement, never in broadcasts, URLs, or logs.
- **`room:resume` (#28).** It reclaims the Participant on a new connection: Lobby and Participant channels, connection tracking, and latency samples. It returns the Lobby, the current Round view in the Participant's own option order with their locked Answer, and the score from revealed Rounds, totalled the same way as the Leaderboard. A User's token only works for that User, and every bad token gets the same `invalid_resume_token`. Resume adds no Participant, uses no place, and broadcasts nothing. Repeats are safe.
- **Reconnect grace (#29).** A Participant whose last socket drops during an open Round counts as connected for early closure for 5 s, so one refresh no longer ends the Question for everyone. The deadline never changes.
- **Web.** The token is stored in `localStorage` per Join Code. Every connect resumes before the page shows itself online. A lost acknowledgement gets at most 5 retries. A refused token falls back to the pending join or the join form. A live Score comes from each reveal's Leaderboard total.
- **New contracts:** `resumeTokenSchema`, `roomResumeSchema`, `roomResumeResponseSchema`, the `room:resume` event, the `invalid_resume_token` error, and `resumeToken` in the join acknowledgement. **New config:** `reconnectGraceMs` (5000).

## Verification summary

- **Automated:** game-server 167 (repeated 3 times), engine 36, web 185, contracts 2, and the database `recordParticipant` id/hash test. Typecheck, Biome, and the production build pass. Each slice was verified on an isolated export of exactly the committed tree, because other sessions (PRD #7, #8, and a visual refresh) were editing the same files.
- **Browser (production build, real Game Server and PostgreSQL):** 11/11 checks passed:
  - the token is stored locally and not in the URL;
  - Guest and signed-in Lobby refreshes resume without the join form;
  - no extra Participant rows, and the Host roster shows each name once;
  - a mid-Round refresh keeps the locked Answer, the option order, and the server deadline;
  - a signed-in Participant can still answer after a refresh;
  - a refresh after the reveal shows the revealed Round and the correct Score.
- **`code-review` (Standards and Spec) per slice.** Fixed:
  - a stale Score display;
  - a resume score that duplicated the Leaderboard totalling;
  - an unbounded browser retry loop.

  Documented the HMAC trade-off.

## Known limitations

- A signed-in Participant whose session lapses mid-Match connects as a Guest. Their resume is refused and the browser drops the token, so they cannot rejoin a started Room.
- Tokens stay in `localStorage` after the Room finishes; anyone using the same browser can reclaim that finished place.
- Live Rooms are memory-only. A Game Server restart loses them, and the stored token hash is not used for recovery yet.
- The reconnect grace covers only the Question in which the drop happened, and it delays early closure by up to 5 s when a Participant really leaves.
- A second-tab takeover policy for signed-in Users is out of scope.

## Authorship

Derived from commit authors on `main`. The implementation was produced with AI agents under the user's direction.

- Codesuke <codesuke@gmail.com>: `95ff9ec` (#28), `332acd1` (#29).

## Follow-ups

- Room recovery after a Game Server restart (deferred by the PRD), which would read `resumeTokenHash`.
- Keep a User-bound token when a signed-in Participant reconnects as a Guest.

## Issue snapshot

## Problem statement

A browser refresh or brief network loss can interrupt a live Room. A Participant must return to the same identity and score without changing the match for anyone else.

## Outcome

A Guest or signed-in Participant resumes a live Room with the same Participant identity, score, and current public state. The browser shows the current Question and remaining server time when a Round is open.

## User stories

1. As a Participant, I want to return after a refresh so I can finish the match with my existing score.
2. As another Participant, I want the Room and Round to continue unchanged when someone reconnects.

## Requirements

- When a Participant first joins, issue an opaque, high-entropy Resume Token bound to that Room and Participant. Store only its hash on the server; never put the token in a Room broadcast, URL, or log. The browser keeps it locally for reconnection.
- On each Game Server connection, a signed-in User still obtains a fresh Socket Ticket. A Resume Token reclaims a Participant within a Room; it does not replace the Socket Ticket as proof of a User account. A Guest can reclaim the Guest Participant with the Resume Token.
- A valid `room:resume` command attaches the new connection to the existing Participant and returns an authoritative Room snapshot. The snapshot includes the Room phase and roster, the Participant's identity and score, whether they already answered the current Round, and the current public Question with that Participant's stable option order and server-based remaining time when a Round is open. It includes current public standings when they exist.
- Never include the correct option or explanation in a pre-reveal snapshot. Do not use browser time to extend a deadline or recalculate a score.
- Resuming does not create a new Participant, consume another place in the 50-Participant limit, reset the Round deadline, reopen an Answer, or broadcast a second join. The resumed connection receives subsequent Room events.
- Reject malformed, unknown, or wrong-Room Resume Tokens without disclosing another Participant's state. A display name or Join Code alone cannot reclaim a Participant. Return a clear error the browser can show.
- Validate the resume command and snapshot at the Socket.IO boundary. Treat a repeated resume safely if the client retries after a lost acknowledgement.

## Acceptance criteria

- [x] A Guest joins a Room, refreshes during an open Round, and sees the same Participant identity, score, Question, option order, already-answered state, and remaining server time.
- [x] A signed-in Participant can do the same after the browser obtains a fresh Socket Ticket; the Resume Token does not sign them in as a different User.
- [x] The Room roster and 50-Participant count do not increase on resume, and other Participants do not see a second join.
- [x] A resumed Participant receives later Room events. The Round's server deadline and all accepted Answers and scores stay unchanged.
- [x] A snapshot sent before reveal contains no correct option or explanation; a snapshot after reveal reflects the revealed phase.
- [x] A malformed, unknown, or wrong-Room token is refused without returning another Participant's identity or score. Reusing a display name or Join Code does not reclaim a score.
- [x] Repeating a valid resume after a lost acknowledgement leaves one Participant identity and does not change the roster or score.

## Implementation decisions

- Decision: Use the existing Participant identity and hashed `resumeTokenHash` model. Bind the opaque token to both Room and Participant; rotate or revalidate it on resume.
  - Rationale: `PS.md` establishes this model, and a display name is not an identity credential.
- Decision: Build snapshots from the Game Server's current Room state and the Participant's saved option order and Answer state.
  - Rationale: The Game Server owns live state and the server deadline. The client cannot reconstruct missed events reliably.
- Decision: Keep Socket Ticket handling on every signed-in connection attempt.
  - Rationale: ADR 0007 separates User authentication from Room-specific Participant recovery.

## Testing decisions

- Highest useful public test seam: join, disconnect, and `room:resume` through the running Game Server's Socket.IO interface, with a browser refresh check.
- Relevant prior tests: Game Server Socket Ticket handshake/reconnect tests, plus the Room join and live Round tests from #4 and #5.
- Behavior that must be verified: Guest and User recovery; token binding and refusal; phase-specific snapshots; stable option order and hidden answer; score and Answer continuity; unchanged deadline and roster; repeated resume; continued event delivery.

## Dependencies

- #4 Rooms & Lobby supplies the Room and Participant join flow.
- #5 Live Rounds & Server-Authoritative Scoring supplies Round state and Answers.

## Out of scope

- Deliberately excluded: signed-in second-tab takeover policy and using a display name as recovery proof.
- Deferred: recovering an active Room after a Game Server process restart or across multiple Game Server processes. #7 supplies full Leaderboard and final-result displays; this spec returns any public standings already available in the current phase.
