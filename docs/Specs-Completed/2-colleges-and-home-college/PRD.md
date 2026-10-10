# PRD #2: Colleges & Home College

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/2
- Archived: 2026-10-10
- Status: all slices implemented, verified, and closed. The PRD issue was closed with the archive.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#21](https://github.com/codesuke/AptiQuiz/issues/21) | Seed approved Colleges | Horizontal | [slice](slices/21-seed-approved-colleges.md) |
| [#22](https://github.com/codesuke/AptiQuiz/issues/22) | User chooses a Home College | Vertical | [slice](slices/22-user-chooses-a-home-college.md) |
| [#23](https://github.com/codesuke/AptiQuiz/issues/23) | Hosting requires a Home College | Vertical | [slice](slices/23-hosting-requires-a-home-college.md) |
| [#37](https://github.com/codesuke/AptiQuiz/issues/37) | Socket Ticket carries the Home College | Vertical | [slice](slices/37-socket-ticket-carries-the-home-college.md) |

## Build summary

- 70 approved Colleges are seeded idempotently with stable IDs and unique normalized names.
- A signed-in User searches Colleges at `/college` and sets or changes one Home College. The account menu shows it.
- 'Host a match' (`/host`) requires a Home College: Users without one are sent to the picker and return after choosing. `requireHostCollege` is the rule PRD #4 consumes to store the Room's College.
- The Socket Ticket's `homeCollegeId` claim carries the User's current Home College (null without one).
- `GET /api/colleges` validates the query (at most 80 characters and 6 words); the picker parses the response with a contracts schema.

### Scope change

Slice #37 was added after `code-review` found the Socket Ticket requirement in the PRD but in none of the approved slices (#21 to #23).

## Hand-offs to later PRDs

- A Room stores the Host's College, and a Guest joins without a College picker: #4.
- A completed result keeps the College held at match time: #7.
- The seed step on deployment: #11. `db:seed` exists but nothing runs it on deploy.

## Verification summary

- Slice evidence is in each slice file. Final run after the review fixes: web 64/64, game-server 13, contracts 2; typecheck, biome, and production build pass.
- `code-review` (Standards and Spec) findings: input validation, unvalidated response cast, duplicated College type, and a missing continue path were fixed in `da3c778`. Other smells were left unchanged: duplicate route wiring, page shell duplication, and the thin `requireHostCollege` wrapper.
- Not verified: the 'Continue to hosting' link and the authenticated redirect-and-return flow in a browser.

## Authorship

Derived from commit authors on `main`. No commit carries a `Co-authored-by` trailer.

- Codesuke <codesuke@gmail.com>: `1429ab1` (#21), `d65908d` (#22), `ae521e7` (#23), `2d158ce` (#37), `da3c778` (review fixes).

## Issue snapshot

- Issue: [#2](https://github.com/codesuke/AptiQuiz/issues/2)
- Labels: ready-for-agent

## Problem statement

Rooms and League results need a consistent College identity without delaying the MVP on College registration and moderation.

## Outcome

Signed-in Users choose a Home College from a seeded list. The Game Server learns each signed-in User's Home College through their Socket Ticket, so later features (#4 Rooms, #8 League) can use it.

## User stories

1. As a User, I want to choose my College so my Rooms and League results have a College.
2. As a User, I want to change my Home College if I picked the wrong one.

## Requirements

- Seed an idempotent list of approved Colleges with stable IDs and unique normalized names.
- Provide a simple searchable College picker for signed-in Users.
- A User has at most one Home College (nullable until chosen) and can choose or change it.
- The Socket Ticket's `homeCollegeId` claim carries the User's current Home College instead of the current hard-coded `null`.
- Guests never see the College picker.

## Acceptance criteria

- [ ] A User can find a seeded College by typing part of its name and set it as Home College.
- [ ] A User can change their Home College; the new value is shown on their next page load.
- [ ] Re-running the seed does not create duplicate Colleges.
- [ ] A signed-in User's Socket Ticket carries their Home College id; a User without one carries `null`.
- [ ] A Guest is never asked for a College.

## Implementation decisions

- Add a nullable Home College reference to the User model through a Prisma migration. Use the existing College model; no status column.
- Normalize seeded names (case and whitespace insensitive) to avoid duplicates. No Pending College state or approval flow is needed for MVP.
- The seed command is shared with the starter Question Set seed (#3) and the deployment seed step (#11).

## Testing decisions

- Highest useful public test seam: College search and Home College selection against the configured PostgreSQL test server; the existing Socket Ticket handler tests for the claim.
- Verify seed idempotency, search, Home College set and change, and the ticket claim.

## Dependencies

- #1 Accounts, Roles & Sign-in.

## Out of scope

- College registration, Pending Colleges, Admin approval or merge, monthly change limits, Guest College selection, and email-domain verification.
- Moved to other PRDs: a Room using the Host's Home College and a Guest joining without a picker (#4); past results keeping the College held at match time (#7 records it, #8 verifies it).
