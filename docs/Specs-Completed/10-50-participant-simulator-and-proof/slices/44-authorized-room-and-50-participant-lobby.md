# Slice #44: Simulate an authorized Room and 50-Participant Lobby

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/44
- Slice type: Vertical
- Parent PRD: [#10](https://github.com/codesuke/AptiQuiz/issues/10)
- Commits: c4c82fd

## Acceptance-criteria result

All criteria met. Local 5- and 50-Participant runs exit 0; count 51 and a bad Host session exit nonzero.

## Implementation summary

Simulator creates a starter Room and Host ticket through the authorized web path (or accepts a supplied pair), joins up to 50 Guests, and proves the public Lobby holds them as distinct Participants. Counts above 50 fail before connecting.

## Verification evidence

- Simulator unit tests, Biome, and TypeScript typecheck pass (66 tests at the end).
- Process-level runs against a running web app and Game Server; see the PRD summary.

## Authorship

Derived from commit authors on `main`: Codesuke <codesuke@gmail.com>. The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/10

## Slice type

Vertical

## What to build

Extend the existing simulator to set up or use a fresh Room with the seeded starter Question Set through an authorized Host path, connect independent virtual Participants through the public Socket.IO interface, and verify that all requested Participants join the same Lobby before the Host starts. Default to 50 Participants and allow a valid smaller count for diagnosis. Keep credentials, Socket Tickets, and future Resume Tokens out of output. Preserve the existing connection and time-ping measurement in a structured report.

## Acceptance criteria

- [ ] The standard run joins 50 distinct Participants into one fresh starter Question Set Room; the public Lobby shows 50 and each Participant has one identity.
- [ ] The Room is created or supplied through the authorized web path and only its Host can drive Host commands.
- [ ] A configurable Game Server target and Participant count work for local and deployed environments; invalid counts, including more than 50, fail before connecting.
- [ ] Connection, join, and setup failures or bounded timeouts produce a nonzero exit status and a useful summary; all sockets close on success or failure.
- [ ] The report distinguishes connected sockets from joined Participants and includes time-ping or acknowledgement latency samples without printing session material or Socket Tickets.
- [ ] A smaller local run and the default 50-Participant Lobby run are reproducible.

## Test seam

The simulator process against the authorized web Room setup path and the public Socket.IO handshake, join, and Lobby events. Assert process exit status and its structured report; reuse existing Game Server Room/Lobby integration behavior as prior art.
