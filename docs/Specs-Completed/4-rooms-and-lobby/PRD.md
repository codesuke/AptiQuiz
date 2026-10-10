# PRD #4: Rooms & Lobby

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/4
- Archived: 2026-10-10
- Status: all slices implemented, verified, and closed. The PRD issue was closed with the archive.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#30](https://github.com/codesuke/AptiQuiz/issues/30) | Host creates a Room | Vertical | [slice](slices/30-host-creates-a-room.md) |
| [#31](https://github.com/codesuke/AptiQuiz/issues/31) | Participants join the Lobby | Vertical | [slice](slices/31-participants-join-the-lobby.md) |
| [#32](https://github.com/codesuke/AptiQuiz/issues/32) | Host starts the Room | Vertical | [slice](slices/32-host-starts-the-room.md) |

## Build summary

- `POST /api/rooms` checks the session, suspension, Home College, and that the Question Set is owned or the starter set. It creates the Room with a stored Question snapshot and a unique six-character Join Code, and is idempotent per Host and key. It then hands the Room to the Game Server through `POST /internal/rooms`, signed with `GAME_SERVER_SECRET` (audience `aptiquiz-game-server-internal`, 60 s). Re-registration is idempotent; the Host Lobby page repeats it to recover from a Game Server restart.
- `/host` lists readable Question Sets and creates a Room. `/host/rooms/[roomId]` shows the Join Code, join link, a browser-generated QR code, Copy buttons, a Share button (native share sheet, or copy with confirmation), the live roster, the scoring rule, and Start.
- `/join` and `/join/[code]` take a display name only (no College picker). Socket.IO `room:join` adds the Participant; `room:lobby` pushes roster and phase changes to that Room only.
- The Game Server owns live Room state in memory: at most 50 Participant identities (slots reserved before the database write), one identity per signed-in User and per Guest key, Host-only `room:host` and `room:start`, and a single Game Engine `START` transition. Participants are stored with `userId` (null for a Guest) and the User's Home College or the Room College. The Room status becomes `RUNNING` on start.
- New contracts: Room registration, create-Room request/response, `room:host`/`room:join`/`room:start` commands and acknowledgements, `room:lobby` snapshot. Migrations `room_snapshot` and `participant_identity`.

## Hand-offs to later PRDs

- #5 owns timed Question delivery; start uses a provisional Question duration only so the Game Engine can leave `LOBBY`.
- #6 owns Resume Tokens. A Guest's join key is kept in `sessionStorage` for that tab only; live Rooms are lost on a Game Server restart until Room recovery exists.

## Verification summary

- Automated: database Room tests against the configured PostgreSQL; Game Server 60 (registration auth, host-only lobby, Guest/User join linkage, invalid input, exact 50/51 including concurrent joins, Room isolation, idempotent join and start, join after start, join racing start, missing-ack safety); web unit tests; typecheck, Biome, and production build.
- Browser (Puppeteer, production build, local Game Server): a Host at 1280 px plus a Guest and a signed-in User at 375 px in separate sessions saw the same roster update live; QR rendered; Share fell back to copy with "Link copied"; invalid name, malformed link, and unknown code showed clear errors; Start reached both players and a late join was refused. Database rows: Room `RUNNING` with a 12-question snapshot; Guest `userId` null with the Room College; signed-in User linked.
- `code-review` (Standards and Spec): fixed missing-ack crash, join racing start, silent store errors, early 413, empty Question Set Room, Guest-refresh ghost Participant, duplicated types, and the invisible Share button.
- Not verified: a physical phone scanning the QR code, and the native share sheet on a phone.

## Authorship

Derived from commit authors on `main`; implementation was produced with AI agents under the user's direction.

- Codesuke <codesuke@gmail.com>: `e565f70` (Rooms, Lobby, start), `deafa8a` (review fixes).

## Issue snapshot

- Issue: [#4](https://github.com/codesuke/AptiQuiz/issues/4)

## Problem statement

Students need a reliable way to gather in one live Room before the Host starts a match. The Host needs to know who joined, and Participants need the same Lobby state on separate devices.

## Outcome

A signed-in User with a Home College creates a Room from their Question Set, shares its Join Code or link, and starts the match after up to 50 Participants join as Guests or signed-in Users.

## User stories

1. As a Host, I want to select my Question Set and share a Join Code so students can enter my Room.
2. As a Participant, I want to see who is in the Lobby and the scoring rule before the match starts.

## Requirements

- A signed-in, non-suspended User with a Home College can create a Room from a Question Set they own or from the starter set (#3). Hosting does not require email verification. The Room records the Host, Home College, selected Question Set, and a stable snapshot of its Questions; #2 and #3 supply the College and Question Set behavior.
- Give each Room a unique six-character Join Code using the existing `roomCodeSchema`, plus a shareable link that opens the same join flow. The Host can copy both.
- The Host's Lobby shows a QR code that encodes the join link, large enough to scan from a phone at arm's length. Scanning it opens the join flow for that Room.
- The Host's Lobby has a Share button. Where the browser supports the native share sheet, it opens with the join link and a short invite message naming the Room's College. Elsewhere, the button copies the link and confirms the copy.
- A Guest or signed-in User enters a display name and joins an existing Room while it is in the Lobby. Validate the name with the existing `displayNameSchema`. Invalid or unknown codes, invalid names, and Rooms that have left the Lobby receive clear, recoverable errors.
- Guests are not asked for a College. Each Participant records the joining User's id (null for a Guest) and the College they play under: the User's Home College, or the Room College for a Guest or a User without a Home College. #7 and #8 depend on this link.
- The Game Server owns the Lobby roster and enforces a maximum of 50 joined Participant identities per Room. A 51st join receives a clear full-Room error. Lobby changes reach the Host and Participants in that Room without a page reload; another Room's roster stays separate.
- Show the Room's College, Question Set title, Join Code, and current Participants in the Lobby. Show the agreed scoring rule before start: correct answers earn 500–1000 points based on speed; wrong or unanswered Questions earn zero. #5 implements scoring.
- Only the Room's Host can start it, and only once from the Lobby. The Game Server authorizes the command and leaves the Lobby. #5 owns the timed Question payload and subsequent Round lifecycle.
- Validate Room commands and acknowledgements at the public HTTP/Socket.IO boundaries. Mutating commands use idempotency keys so retries do not create another Room, Participant, or start transition.

## Acceptance criteria

- [x] A signed-in User with a Home College can select an owned Question Set or the starter set, create a Room, and copy its Join Code and link. The Room is associated with that User's Home College and keeps the selected Questions stable if the source set is edited later.
- [x] Scanning the Lobby QR code with a phone camera opens the join flow for that Room.
- [x] On a phone, Share opens the native share sheet with the join link; on a browser without native sharing, Share copies the link and shows a confirmation.
- [x] A User without a Home College is prompted to choose one; a Guest, suspended User, or User selecting someone else's Question Set cannot create the Room.
- [x] A Guest and a signed-in User can each join by code or link with a valid display name. In two separate browser sessions, both see the same Lobby roster update without reloading.
- [x] A Guest joins without a College picker. A signed-in Participant's record links to their User and Home College; a Guest's links to no User and the Room College.
- [x] An invalid or unknown Join Code, invalid display name, and a join attempt after the Room leaves the Lobby each receive a clear error without adding a Participant.
- [x] Exactly 50 Participant identities can join one Room; a 51st is refused without changing that Room's roster. Participants in another Room do not appear in it.
- [x] Before start, the Host and Participants can see the College, Question Set title, Join Code, roster, and correct/wrong scoring rule on a narrow or desktop screen.
- [x] The Host can start the Room once. A Guest, another User, or a repeated start command cannot start it or create a second transition; all connected members see that it has left the Lobby.
- [x] Retrying a Room creation or join with the same idempotency key returns the original result without creating a duplicate Room or Participant.

## Implementation decisions

- Decision: The web app checks the current session, Home College, and that the Question Set is owned by the User or is the starter set before an authenticated server-to-server Room creation request; the Game Server owns live Room state and start authorization.
  - Rationale: This follows ADR 0007 and keeps the Game Server authoritative without giving it web cookies or direct auth-table access.
- Decision: Reuse the existing Join Code and display-name schemas, the `Room`/`Participant` database models, and the Game Engine's `LOBBY` start transition. Add runtime-validated public contracts for new commands and acknowledgements.
  - Rationale: These are the existing seams; the current Game Server has only connection identity and `time:ping` handlers.
- Decision: Keep live Lobby state in one Game Server process.
  - Rationale: ADR 0006 defers Redis; active Rooms can be lost on a process restart until a later recovery design is implemented.

- Decision: Generate the QR code in the browser from the join link, and use the Web Share API with a copy-to-clipboard fallback.
  - Rationale: No server work or stored images; the join link is already public, and the Join Code alone grants entry, so the QR code reveals nothing new.

## Testing decisions

- Highest useful public test seam: HTTP Room creation through the web app and Socket.IO join, Lobby update, and start commands through a running Game Server.
- Relevant prior tests: Game Server handshake and Socket Ticket tests; Game Engine `LOBBY` transition tests. The current 50-connection simulator tests connectivity only.
- Behavior that must be verified: creation authorization, Participant User and College linkage, and College/Question Set association against the configured PostgreSQL test server; unique code and stable Question snapshot; Guest and User join; room-scoped roster broadcasts; exact 50/51 boundary; invalid inputs; Host-only, single start; and idempotent retries. Demonstrate two browser sessions and a narrow viewport.

## Dependencies

- #1 Accounts, Roles & Sign-in (complete).
- #2 Colleges & Home College.
- #3 Question Set Authoring.

## Out of scope

- Deliberately excluded: late joining after start, projector view, one-live-Room restriction, custom idle expiry, and extra Room presentation controls.
- Deferred to #5: timed Questions, answer acceptance, scoring, reveal, and further Round transitions.
- Deferred to #6: Resume Tokens and reclaiming a Participant after refresh or disconnection. Full-match 50-Participant load proof belongs to the later match verification work.




