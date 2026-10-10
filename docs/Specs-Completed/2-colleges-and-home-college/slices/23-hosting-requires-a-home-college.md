# Slice #23: Hosting requires a Home College

- Parent PRD: [#2](https://github.com/codesuke/AptiQuiz/issues/2) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/23
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met, according to the closing comment and the verification below.

## Implementation summary

- `requireHostCollege(database, userId)` returns the Home College or the typed refusal `home_college_required`.
- The home page 'Host a match' link opens `/host`: Guests go to sign-in, Users without a Home College go to `/college?next=/host` and return after choosing. `next` is allow-listed to `/host`.
- `/host` is a placeholder that names the College a Room will belong to. Room creation is PRD #4.

## Verification evidence

- 12 new behavior tests including a Room keeping its College after the Host changes Home College (PostgreSQL); web suite 62/62.
- Typecheck, biome, production build; Guest redirect checked on a built server. Authenticated redirect-and-return walk-through not run in a browser.

## Authorship

- Commit `ae521e7` on `main` by Codesuke <codesuke@gmail.com>. No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#23](https://github.com/codesuke/AptiQuiz/issues/23)
- State at archive time: CLOSED
- Labels: ready-for-agent

## Parent

#2

## Slice type

Vertical

## What to build

A server-side rule says a Host must have a Home College. For a User who has one, it returns the College a new Room must store. For a User without one, the Host entry point prompts them to choose a College with the picker, then continues. Room creation itself belongs to the Rooms & Lobby PRD (#4), which consumes this rule.

## Acceptance criteria

- [ ] The rule returns the Home College for a User who has one.
- [ ] The rule refuses a User without a Home College with a distinct, typed reason.
- [ ] The Host entry point sends a User without a Home College to choose one, then returns them to hosting.
- [ ] Changing Home College later does not alter any College already stored on a Room.
- [ ] Behavior tests run against the configured PostgreSQL test server with Users that have and lack a Home College.

## Blocked by

Set as a native blocking edge: the Home College selection slice.
