# 8. College League

## The idea

A College League lets colleges compare their students over many Matches. It also gives each student a reason to play again.

## Rooms belong to a college

Each Host selects one Home College. Each Room that the Host creates belongs to that college. The list of colleges is approved and loaded into the database before use.

## Which scores count

When a Match finishes, the server saves a result for each player. A result counts in the League only if:

- the player was signed in, and
- the player's email was verified at the end of the Match.

Guests can play, but their scores do not count. This makes it difficult to add false players to the League.

A player's score counts for their own Home College. If the player has no Home College, it counts for the college of the Room.

## The period

The League uses one-week periods. A period starts on Monday at 00:00 UTC. It ends at the next Monday at 00:00 UTC. A result belongs to the week in which its Match finished.

## The tables

The `/league` page shows two tables for the current week:

| Table | Content |
|---|---|
| Top players | The 10 players with the most total points. |
| Top colleges | The 10 colleges with the most total points from their players. |

If two rows have the same points, the table sorts them by name.

## Where the code is

- League calculation: `Apti-App/packages/database/src/college-league.ts`
- League page: `Apti-App/apps/web/src/app/league/page.tsx`
