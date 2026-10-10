## Final issue snapshot

# Expose revealed Round speed data safely

https://github.com/codesuke/AptiQuiz/issues/70

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/69

## Slice type

Horizontal

## What to build

Extend the revealed Round contract and Game Server payload so a Host can use server-calculated Effective Response Time for accepted answers after reveal, while preserving the existing open-Question secrecy boundary.

## Acceptance criteria

- [ ] Revealed Round scores expose an optional Effective Response Time only when a Participant has an accepted answer.
- [ ] Open-Question contracts and payloads expose no correctness, Round points, or response-time data.
- [ ] Existing scoring, Leaderboard order, and tie breakers remain unchanged.
- [ ] Contract and Game Server tests prove both post-reveal availability and open-phase secrecy.

## Test seam

The public Round contract and Game Server reveal event.

## Result

- Status: closed; all acceptance criteria met.
- Commit: a2d3290
- Implementation: roundScoreSchema gains optional effectiveResponseMs (server bucketed value used for points; null without an accepted Answer); Game Server roundScores() copies the stored value.
- Verification: Contracts 6/6 and Game Server 165/165 tests pass, including an open-phase secrecy test over acks and round:state.
- Author: Codesuke (@codesuke), human. Co-authors: none.
