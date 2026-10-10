# AptiQuiz Domain Language

AptiQuiz is a live aptitude competition for students preparing for placements. Use the terms below consistently in code, tests, issues, and user-facing copy.

## Language

**Question Set**:
A reusable, ordered collection of Questions owned by a Host.
_Avoid_: quiz pack, test bundle.

**Question**:
One aptitude prompt with options, one correct option, a Topic, and a Difficulty.
_Avoid_: challenge, item.

**Host**:
The person authorized to create a Room and control its match progression.
_Avoid_: admin, game master.

**Room**:
One live match created from a Question Set and associated with a College.
_Avoid_: lobby when referring to the whole match, session.

**Join Code**:
The short public code a Participant uses to enter a Room.
_Avoid_: room ID, invite token.

**Participant**:
A student competing in a Room under one persistent identity and score.
_Avoid_: player, user when referring specifically to a competitor.

**Lobby**:
The pre-match Room phase in which Participants gather and the Host can start the match.
_Avoid_: waiting room.

**Round**:
The server-timed lifecycle for one Question: open, answer collection, reveal, and scoring.
_Avoid_: level, turn.

**Game Server**:
The authoritative runtime that owns live Room state, timing, answer acceptance, and scoring.
_Avoid_: backend when the authoritative role matters.

**Leaderboard**:
The ordered Room standings shown after a Round and at match completion.
_Avoid_: scoreboard.

**College League**:
The time-bounded aggregation of completed Room results into top Participants and Colleges.
_Avoid_: global Leaderboard.

**Resume Token**:
An opaque secret that allows a disconnected Participant to reclaim the same Room identity and score.
_Avoid_: session ID, Join Code.

**Effective Response Time**:
The server-calculated response duration used for scoring after applying the documented network-delay policy.
_Avoid_: client time, ping-adjusted guess.

**College**:
An approved institution that Participants represent and that Rooms are hosted under.
_Avoid_: school, university, institute.

**Pending College**:
A College submitted through the registration form that an Admin has not yet approved or rejected.
_Avoid_: draft college, unverified college.

**Home College**:
The single College a signed-in User represents in the College League.
_Avoid_: affiliation, campus.

**User**:
A signed-in account holder who can play, author Question Sets, and act as a Host.
_Avoid_: member, customer.

**Guest**:
A person who joins a Room through a Join Code or link without signing in.
_Avoid_: anonymous user, visitor.

**Admin**:
A User whose email is listed in the deployment's admin allow-list and who manages Colleges, Users, Question Sets, Rooms, and League results.
_Avoid_: moderator, superuser, Host.

**Featured Question Set**:
A Question Set that an Admin has made available for any User to host.
_Avoid_: public set, template.

**Socket Ticket**:
A short-lived signed credential that proves a signed-in User's identity to the Game Server.
_Avoid_: session token, Resume Token.

**League Period**:
The time window a College League table covers: this week, this month, or all time.
_Avoid_: season.

**Counted Match**:
A completed Room result that is eligible to add points to the College League.
_Avoid_: ranked game, official match.
