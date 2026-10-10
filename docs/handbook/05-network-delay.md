# 5. Network Delay

## The problem

Two students click an answer at the same moment. One student uses fast campus Wi-Fi. The other student uses a slow mobile connection.

The answer from the slow connection arrives at the server later. If the server uses only the arrival time, the slow student looks slower. This is not fair.

## The solution in three steps

### Step 1: The server measures each connection

Every 2 seconds, the server sends a small "ping" to each player. The browser replies at once. The server measures the time for the full trip. This is the round-trip time.

The server keeps the last 5 measurements. It uses the middle value (the median). One bad measurement therefore does not change the result.

The browser does not report its own time. The server makes all measurements. A player therefore cannot send a false time.

### Step 2: The server gives back part of the travel time

Half of the round-trip time is about the time that an answer needs to travel to the server. The server subtracts this half from the answer time.

There is a limit. The server never subtracts more than 100 ms. The limit is the same for all players.

```text
correction = smaller of (median round trip ÷ 2) and 100 ms
```

If the server has no measurement yet, the correction is 0.

### Step 3: The server rounds to steps of 100 ms

The server rounds the corrected time down to a step of 100 ms. Two answers in the same tenth of a second get the same points. Very small network differences therefore do not change the score.

## The full calculation

```text
time = answer arrival − Question start − correction
time = rounded down to 100 ms, between 0 and 30 000 ms
points = 500 + floor(500 × (1 − time ÷ 30 000))
```

## Why the limit is 100 ms

A student can try to slow down their ping replies. Then the server sees a larger round trip and gives a larger correction. The 100 ms limit stops this trick. The largest possible gain is 0.1 seconds. This is worth about 2 points at most.

## The deadline does not move

The correction changes only the points of an answer that arrived in time. It never makes a late answer valid.

The server accepts an answer only if it arrives at or before `endsAt`. There is no grace period. If the answer arrives late, the server rejects it, even if the player's screen still showed time.

## Summary

| Question | Answer |
|---|---|
| Who measures the delay? | The server. |
| How often? | Every 2 seconds, with the last 5 measurements. |
| How much correction? | Half of the median round trip, 100 ms at most. |
| Does it change the deadline? | No. |
| Can a student use it to cheat? | The gain is 0.1 seconds at most. |
