# Slice #47: Record the deployed 50-Participant proof

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/47
- Slice type: Horizontal
- Parent PRD: [#10](https://github.com/codesuke/AptiQuiz/issues/10)
- Commits: 12a9eaa, 69495fb

## Acceptance-criteria result

All criteria met. Exit 0 on 2026-10-10 14:56 UTC. Server hardware is not visible to the runner and is recorded as such.

## Implementation summary

Ran the same scenario against the deployed Game Server with a throwaway production Host and recorded the date, runner hardware, timing constants, counts, labelled latency, and outcome in the README.

## Verification evidence

- Simulator unit tests, Biome, and TypeScript typecheck pass (66 tests at the end).
- Process-level runs against a running web app and Game Server; see the PRD summary.

## Authorship

Derived from commit authors on `main`: Codesuke <codesuke@gmail.com>. The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/10

## Slice type

Horizontal

## What to build

Run the completed simulator against the deployed Game Server using the same public scenario and report format as the local proof. Document the authorized setup, configuration names, command, report interpretation, and actual deployed result in the README. Record the run date, Game Server and runner hardware, service configuration, Round timing constants, key measured counts and latency percentiles, and outcome. Do not publish credentials, Socket Tickets, Resume Tokens, or an unsupported capacity claim.

## Acceptance criteria

- [ ] A 50-Participant full-match run against the deployed Game Server completes and its simulator process exits zero.
- [ ] The README gives a repeatable setup and command for local and deployed runs and explains each reported metric.
- [ ] The README records the deployed run date, server and runner hardware, configuration, timing constants, counts, labelled latency measurements, and actual result.
- [ ] The recorded evidence matches the simulator report and contains no session material, Socket Tickets, Resume Tokens, or connection strings.
- [ ] If the deployed run does not pass, the README accurately states the failure and does not claim proven 50-Participant support.

## Test seam

The simulator's exit status and structured report against the deployed public Game Server, checked against the retained README evidence. No separate load harness or internal Game Server inspection.
