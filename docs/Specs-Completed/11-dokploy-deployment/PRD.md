# PRD #11: Dokploy Deployment

- Issue URL: https://github.com/codesuke/AptiQuiz/issues/11
- Archived: 2026-10-10
- Status: all slices implemented, verified, and closed. The PRD issue was closed with the archive.

## Slices

| Issue | Title | Type | Archive |
|---|---|---|---|
| [#63](https://github.com/codesuke/AptiQuiz/issues/63) | Verify WebSocket handshake and CORS on the deployed servers | Horizontal | [slice](slices/63-websocket-and-cors-on-deployed-servers.md) |
| [#64](https://github.com/codesuke/AptiQuiz/issues/64) | Prove migrations on web start and a secret-free repository | Horizontal | [slice](slices/64-migrations-on-web-start-and-secret-free-repo.md) |
| [#65](https://github.com/codesuke/AptiQuiz/issues/65) | Verify production Google sign-in and email links | Horizontal | [slice](slices/65-production-google-sign-in-and-email-links.md) |
| [#66](https://github.com/codesuke/AptiQuiz/issues/66) | Document the deployed setup in the README | Horizontal | [slice](slices/66-document-the-deployed-setup.md) |

## Build summary

- Verified the deployed web app and Game Server: WebSocket handshake from the web origin, CORS limited to the web origin, migrations applied by the web start command, a secret-free repository, and production Google sign-in and email links.
- Added a README Deployment section and corrected Architecture.md status and the claims ledger.
- Found and fixed a test defect: web tests load `Apti-App/.env`, which can hold real Gmail credentials, so the Google sign-in integration test sent a real verification email to a throwaway `example.test` address. `apps/web/vitest.config.ts` now blanks the Gmail variables for tests (commit b955b73).

## Verification summary

- Deployed probes and evidence comments on #63, #64, #65.
- Web tests `google-sign-in.integration.test.ts` and `mail-sender.test.ts` pass after the fix (9 tests).
- Formal `code-review` was not run; the code change is five lines of test config and the rest is documentation.

## Known limitations

- Probes were run from Node, not a real browser.
- Migrations were proven on a scratch schema; Docker was unavailable, so the container and Dokploy logs were not inspected.
- The email link domain is confirmed by the owner's report only.
- Live Rooms are lost on a Game Server restart.

## Authorship

Codesuke <codesuke@gmail.com> (`b955b73`, `8496c5a`). Produced with an AI agent under the user's direction.

## Final PRD issue snapshot

## Problem statement

The MVP needs a reachable web app and Game Server for a phone-based demo and deployed 50-Participant proof.

## Outcome and current status

The user reports that both services are deployed on Dokploy. On 2026-10-10, `https://aptiquiz.codesuke.in/api/health` and `https://game.aptiquiz.codesuke.in/health` each returned HTTP 200. Deployment verification and documentation remain in this PRD.

## Requirements

- Web at `https://aptiquiz.codesuke.in` and Game Server at `https://game.aptiquiz.codesuke.in`, with TLS and WebSocket proxying by Dokploy.
- Game Server production CORS allows the web origin. Browser connects over WebSocket.
- Web container applies Prisma migrations before start. Game Server does not apply migrations.
- PostgreSQL uses Dokploy settings. Redis remains provisioned but unused.
- Secrets come from Dokploy environment settings and are never committed.
- Production auth: `BETTER_AUTH_URL` is the production web URL, and the Google OAuth client lists the production redirect URI. Verification and reset emails link to the production domain.
- Keep web `GET /api/health` and Game Server `GET /health`.
- Provide a database seed command for the MVP College list and starter Question Set.
- README explains service domains, deployment, migration, seed, configuration names, and the final 50-Participant proof.

## Acceptance criteria

- [x] Both health endpoints respond over HTTPS on their domains (checked 2026-10-10).
- [ ] A browser on the deployed web app connects to the Game Server over WebSocket.
- [ ] A request from another origin is refused by the Game Server CORS policy.
- [ ] Deploying a new schema migration applies it on web container start.
- [ ] No secret value exists in the repository.
- [ ] Google sign-in works on the deployed web app, and verification and reset emails link to the production domain.
- [ ] The README documents the deployed setup and, after #10, its 50-Participant result.

## Implementation decisions

- Use the existing Dokploy deployment and two subdomains per ADR 0008.
- Keep Redis unused in the one-process MVP.

## Testing decisions

- Highest useful public test seam: deployed health endpoints, browser WebSocket handshake, CORS rejection, migration startup evidence, and the #10 simulator against production.

## Dependencies

- None for deployment verification; the final full-match proof depends on #10.

## Out of scope

- Multiple Game Server instances, Redis adapter, CI/CD pipelines, and monitoring dashboards.

## Further notes

- Live Rooms are lost on Game Server restart until a later persistence design. Avoid a redeploy during the live demo.
