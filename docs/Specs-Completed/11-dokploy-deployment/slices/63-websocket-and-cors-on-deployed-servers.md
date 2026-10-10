# Slice #63: Verify WebSocket handshake and CORS on the deployed servers

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/63
- Slice type: Horizontal
- Parent PRD: [#11](https://github.com/codesuke/AptiQuiz/issues/11)
- Acceptance criteria: all met (see below).

## Issue snapshot

## Parent PRD

https://github.com/codesuke/AptiQuiz/issues/11

## Slice type

Horizontal

## What to build

Evidence that a browser on the deployed web origin connects to the deployed Game Server over WebSocket, and that another origin is refused by the CORS policy.

## Acceptance criteria

- [x] A Socket.IO handshake from origin https://aptiquiz.codesuke.in connects to https://game.aptiquiz.codesuke.in over WebSocket.
- [x] A request and handshake from a different origin are refused by the Game Server CORS policy.
- [x] Evidence is posted on this issue.

## Test seam

Deployed public endpoints.

## Implementation summary

A WebSocket-only Socket.IO handshake with Origin https://aptiquiz.codesuke.in connected to https://game.aptiquiz.codesuke.in and received server:ready. The CORS policy returns access-control-allow-origin only for the web origin, including for requests that send another origin. Probes ran from Node, not a real browser.

## Verification evidence

Evidence comment on issue #63.

## Authorship

Codesuke <codesuke@gmail.com> is the repository author. Probes and docs were produced with an AI agent under the user's direction.
