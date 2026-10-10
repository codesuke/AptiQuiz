# Slice #37: Socket Ticket carries the Home College

- Parent PRD: [#2](https://github.com/codesuke/AptiQuiz/issues/2) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/37
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met, according to the closing comment and the verification below.

## Implementation summary

- The Socket Ticket's `homeCollegeId` claim comes from the User's current Home College, read per ticket (null without one). A change applies to the next ticket.
- Added after review found the PRD requirement in no slice; published as a sub-issue of #2 and blocked by #22.

## Verification evidence

- Socket Ticket handler tests (3, including a change between tickets); web suite 63/63; game-server 13 and contracts tests pass; typecheck and biome clean.
- Limitation: tests stub the lookup; `getHomeCollege` is covered by the PostgreSQL tests. Test written alongside the implementation, not red-first.

## Authorship

- Commit `2d158ce` on `main` by Codesuke <codesuke@gmail.com>. No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#37](https://github.com/codesuke/AptiQuiz/issues/37)
- State at archive time: CLOSED
- Labels: ready-for-agent

## Parent

#2

## Slice type

Vertical

## What to build

The Socket Ticket carries the signed-in User's current Home College so the Game Server learns it. Added after review found the claim in the PRD but in no slice. The ticket's `homeCollegeId` claim holds the User's current Home College id instead of the hard-coded `null`; a User without a Home College gets `null`. Changing the Home College affects the next ticket the browser requests.

## Acceptance criteria

- [ ] A signed-in User's Socket Ticket carries their Home College id.
- [ ] A User without a Home College gets a ticket with `homeCollegeId` null.
- [ ] After a User changes Home College, the next requested ticket carries the new id.
- [ ] The existing Socket Ticket handler tests cover the claim, against the configured PostgreSQL test server where a database is needed.
- [ ] The Game Server still accepts the ticket and reports the identity in `server:ready`.

## Blocked by

Set as a native blocking edge: the Home College selection slice (#22, closed).
