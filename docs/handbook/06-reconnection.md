# 6. Reconnection

## The requirement

A player can refresh the page or lose the connection during a Match. The player must come back with the same score and see the current Question. The other players must see no change.

## The Resume Token

When a player joins a Room, the server sends a secret Resume Token to that player only.

- The browser keeps the token for that browser tab.
- The token is a signature of the Room and the player. Only the server can make it, because only the server knows the secret key.
- The server does not store the token. It stores only a hash (a one-way fingerprint) of the token. A copy of the database therefore does not give the tokens.

## What happens after a refresh

1. The browser opens a new connection to the server.
2. Before it shows "online", the browser sends the Resume Token.
3. The server finds the hash of the token in that Room.
4. The server connects the new connection to the same player.
5. The server sends back the full state of the Room.

The player gets back:

| Item | Comes back |
|---|---|
| Identity and display name | Yes, the same player. |
| Score | Yes, from all revealed Questions. |
| Current Question | Yes, with the same option order. |
| An answer that the player already sent | Yes, it stays locked. |
| Deadline | Yes, the real server deadline. It does not reset. |

If the acknowledgement is lost, the browser tries again, up to 5 times. If the server refuses the token, the browser shows the join form again.

## What the other players see

Nothing changes for them. A resume:

- does not add a new player,
- does not use a place in the Room,
- does not send a message to the other players,
- does not change the timer.

## The 5-second grace

A Round can close early when all connected players have answered. Without protection, a refresh could close the Round for everyone.

For this reason, a player who disconnects still counts as connected for 5 seconds. If the player comes back in this time, nothing changes. If the player does not come back, the server applies the normal early-close rule.

## A name is not an identity

Two players can have the same display name. A display name never gives access to a score. Only the Resume Token can bring back a player.

If a player is signed in, the token works only on a connection from the same account.

## Limit

The server keeps live Rooms in memory. If the Game Server restarts, the live Rooms are lost. Completed results are already in the database. See [Limits and next steps](13-limits.md).
