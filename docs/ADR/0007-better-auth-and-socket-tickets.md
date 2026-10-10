# Better Auth in the Web App and Signed Socket Tickets for the Game Server

AptiQuiz needs Users (email/password and Google OAuth), Admins, and Guests. Better Auth runs inside `Apti-App/apps/web` on PostgreSQL; the Game Server, which runs on a separate origin, trusts a short-lived Socket Ticket signed with a secret shared only by the two servers instead of reading web cookies or auth tables.

## Status

accepted

## Considered Options

- Anonymous host keys with no accounts.
- Better Auth in `Apti-App/apps/web`, Socket Tickets for the Game Server (chosen).
- Game Server reads Better Auth session tables directly from PostgreSQL.
- One domain behind a reverse proxy so the Game Server receives the auth cookie.

## Consequences

- The Game Server verifies identity without a database call per connection and stays stateless about auth when scaled out.
- `Apti-App/apps/web` and `Apti-App/apps/game-server` share a `GAME_SERVER_SECRET`; rotating it invalidates outstanding tickets.
- Room creation is a server-to-server call from `Apti-App/apps/web` to the Game Server, authorized by the same secret, so hosting permission and Question Set ownership are checked where the database lives.
- Guests connect without a ticket and are identified only by their Resume Token.
- Admins are defined by the `ADMIN_EMAILS` environment variable; there is no admin-management UI.
- Email is delivered through Gmail SMTP (about 500 messages a day). Email verification gates League points, not play or hosting, so mail delays cannot block a match.
