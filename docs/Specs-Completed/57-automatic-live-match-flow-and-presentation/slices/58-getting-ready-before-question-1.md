# Slice #58: Getting ready before Question 1

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/58
- Slice type: Vertical
- Parent PRD: [#57](https://github.com/codesuke/AptiQuiz/issues/57)
- Commits: 2a87f50, c5f6e8f
- Status: implemented and closed

## Acceptance-criteria result

The observable behavior in this slice is implemented and covered by the verification below. Browser inspection remains an open verification gap for motion and sound in #61 and #62.

## Implementation summary

The Game Server publishes one 3-second Getting ready deadline, opens Question 1 automatically, refuses early Answers, and preserves the deadline in reconnect snapshots. Host and Participant views show the same text countdown.

## Verification evidence

Public Socket.IO tests with an injected clock and web countdown tests passed.

## Authorship

Derived from implementation commit authors: Codesuke <codesuke@gmail.com>. The implementation was produced with AI agents under the user's direction.

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/57

## Slice type

Vertical

## What to build

Starting a Room enters a server-timed 3-second Getting ready state before Question 1. Host and Participants see the same countdown and recover it on reconnect. The first Question then opens automatically at its server deadline.

## Acceptance criteria

- [ ] Only the Host can start once from the Lobby; start publishes Getting ready with one authoritative deadline.
- [ ] Neither Host nor Participant sees Question 1 or can submit an Answer before the ready deadline.
- [ ] At the ready deadline, Question 1 opens automatically with its existing 30-second answer window and per-Participant option order.
- [ ] Reconnecting during Getting ready receives the same phase, deadline, and remaining countdown.
- [ ] The ready screen remains readable on desktop and mobile and has an accessible text countdown.

## Test seam

Public Socket.IO start, host, join, resume, and Answer commands with injected clock and scheduler; focused web countdown view tests.
