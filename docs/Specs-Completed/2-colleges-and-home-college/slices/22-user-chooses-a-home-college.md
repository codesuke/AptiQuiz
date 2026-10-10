# Slice #22: User chooses a Home College

- Parent PRD: [#2](https://github.com/codesuke/AptiQuiz/issues/2) ([archive](../PRD.md))
- Issue URL: https://github.com/codesuke/AptiQuiz/issues/22
- Slice type: Vertical
- Closed: 2026-10-10

## Acceptance-criteria result

All criteria met, according to the closing comment and the verification below.

## Implementation summary

- New nullable `User.homeCollegeId` with a Prisma-generated migration (`home_college`).
- `GET /api/colleges?q=` searches Colleges; `PUT /api/home-college` sets the Home College (401 Guest, 403 suspended, 400 bad input, 404 unknown College).
- `/college` picker for signed-in Users; the account menu shows the current Home College. Guests are redirected to sign-in.
- The shared Prisma client moved to `apps/web/src/lib/database.ts`.

## Verification evidence

- 5 behavior tests against PostgreSQL (search, set/replace keeps one, none by default, invalid input, Guest/suspended); web suite 50/50.
- Typecheck, biome, production build; browser run of search, choose, and persistence on the home page.

## Authorship

- Commit `d65908d` on `main` by Codesuke <codesuke@gmail.com>. No `Co-authored-by` trailers.

## Issue snapshot

- Issue: [#22](https://github.com/codesuke/AptiQuiz/issues/22)
- State at archive time: CLOSED
- Labels: ready-for-agent

## Parent

#2

## Slice type

Vertical

## What to build

A signed-in User searches the seeded Colleges in a simple picker and sets one as their Home College. A User has one Home College and can change it later. The current choice shows in the account area. Guests and signed-out visitors never see the picker. A suspended User or a request with no session cannot set a Home College.

## Acceptance criteria

- [ ] A User can search for a seeded College and set it as Home College.
- [ ] A User can change their Home College later; only one is stored.
- [ ] The current Home College is visible to the signed-in User.
- [ ] A request with no session, or from a suspended User, is rejected.
- [ ] Guests are not shown a College picker.
- [ ] Behavior tests run against the configured PostgreSQL test server.

## Blocked by

Set as a native blocking edge: the seed slice.
