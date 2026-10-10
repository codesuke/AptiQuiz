# AptiQuiz screen build order

The sequence in which to mock each UI screen, derived from the MVP scope issue [#13](https://github.com/codesuke/AptiQuiz/issues/13) and its `[PRD]` sub-issues. Mock each step before its PRD is sliced with `/to-tickets`, so the slices can reference a finished screen.

Last update: 2026-10-10

## How the order was chosen

1. **PRD dependency order from #13.** A screen is mocked before the screens of any PRD that depends on it: #1 → #2 → #3 → #4 → #5 → #6 → #7 → #8 → #12 → #9.
2. **Acceptance journey first.** Steps 1–6 cover the `PS.md` acceptance journey end to end. Everything after step 6 is outside the three-minute demo.
3. **Shared components before screens.** Step 0 defines the parts that most screens reuse, so later mocks are assembled, not redrawn.

PRDs with no UI screens: #10 (50-Player Simulator & Proof) and #11 (Dokploy Deployment).

## Rules for every mock

- Mobile-first: design at 360px wide, then desktop. Host projector views design at 1920×1080 first.
- Keyboard usable, visible focus, readable contrast, controls at least 44px high (48px in the auth kit).
- Answer states use shape and text plus colour, never colour alone.
- Respect reduced motion. Provide a sound on/off toggle on match screens.
- Use `CONTEXT.md` terms in all copy: Participant, Host, Room, Join Code, Lobby, Round, Leaderboard, College League.
- Never show the correct option on any pre-reveal screen.
- Tokens come from root `DESIGN.md` (via `aptiquiz-auth-kit/tokens/auth.css` until a shared token file exists).
- One kit folder per area, following the `aptiquiz-auth-kit/` shape: `screens/`, `prototypes/`, `prompts/`, `manifest.json`, `README.md`.

## Status key

`DONE` mock and prototype exist · `TODO` not started · `LATER` after the 50-player simulation passes (#13 rule)

---

## Step 0 — Shared component sheet

Kit: `aptiquiz-ui-kit/` · Blocks: every step below

| # | Component | States to show | Status |
|---|---|---|---|
| 0.1 | App shell (top bar: mark, Room code chip, score chip, sound toggle, rules info link) | Guest, signed-in User, in-match | TODO |
| 0.2 | Option button | idle, hover, focus, selected, locked, correct ✓, wrong ✗, disabled | TODO |
| 0.3 | Countdown (ring and bar) | running, last 5 seconds, expired | TODO |
| 0.4 | Participant row | default, you, disconnected, joined late, up N ▲, down N ▼, new | TODO |
| 0.5 | Topic tag and Difficulty pill | quantitative, logical, verbal, data interpretation · easy, medium, hard | TODO |
| 0.6 | Stat tile and Topic accuracy bar | Strongest, Needs work | TODO |
| 0.7 | Banner / toast | info, success, error, reconnecting | TODO |
| 0.8 | College picker (type-ahead) | empty, results, no match → "Register your College", Pending College tag | TODO |
| 0.9 | Empty, loading, and error page templates | — | TODO |

## Step 1 — Accounts, Roles & Sign-in · [#1](https://github.com/codesuke/AptiQuiz/issues/1)

Kit: `aptiquiz-auth-kit/`

| # | Screen | Notes | Status |
|---|---|---|---|
| 1.1 | Sign in | Email/password and Google, "Join as Guest" entry | DONE |
| 1.2 | Sign in — error and loading states | Wrong credentials, suspended account, rate-limited | TODO |
| 1.3 | Sign up | Display name, email, password (8–128) | TODO |
| 1.4 | Check your email (verification sent) | Resend action | TODO |
| 1.5 | Unverified User notice | Persistent banner on every signed-in page, "Resend verification email" | TODO |
| 1.6 | Forgot password | Same confirmation for known and unknown emails | TODO |
| 1.7 | Reset email sent | — | TODO |
| 1.8 | Set new password | — | TODO |
| 1.9 | Password reset success | — | TODO |
| 1.10 | Expired or used link | "Request a new link" | TODO |
| 1.11 | Header account states | Guest: "Sign in" · User: name + "Sign out" | TODO |
| 1.12 | Not allowed (403) | Shared with `/admin` for non-Admins | TODO |

## Step 2 — Colleges & College Registration · [#2](https://github.com/codesuke/AptiQuiz/issues/2)

Kit: `aptiquiz-college-kit/`

| # | Screen | Notes | Status |
|---|---|---|---|
| 2.1 | Choose Home College | First sign-in onboarding, uses picker 0.8 | TODO |
| 2.2 | Register a College | Name, city, state, optional website or email domain; duplicate error with link to existing College | TODO |
| 2.3 | Pending College status | Pending, approved, rejected with reason → "Pick another Home College" | TODO |
| 2.4 | Change Home College | Once per calendar month; refused state with explanation | TODO |

## Step 3 — Question Set Authoring · [#3](https://github.com/codesuke/AptiQuiz/issues/3)

Kit: `aptiquiz-authoring-kit/`

| # | Screen | Notes | Status |
|---|---|---|---|
| 3.1 | My Question Sets | Own sets + Featured sets; create, rename, duplicate, delete, "Create Room"; empty state | TODO |
| 3.2 | Question Set editor | Question list with drag and keyboard reorder, add Question | TODO |
| 3.3 | Question form | Text, 2–6 options, one correct, Topic, Difficulty, time limit 10–90 s, explanation, `https` image URL, table builder | TODO |
| 3.4 | Question validation errors | Zero or two correct options, fewer than 2 options, bad image URL | TODO |
| 3.5 | Question preview | How the Question renders to Participants (image and table variants) | TODO |
| 3.6 | Delete confirmations | Question and Question Set | TODO |

## Step 4 — Rooms & Lobby · [#4](https://github.com/codesuke/AptiQuiz/issues/4)

Kit: `aptiquiz-match-kit/` (shared with steps 5–7)

| # | Screen | Notes | Status |
|---|---|---|---|
| 4.1 | Create Room | Pick Question Set and Room home College; "already hosting a live Room" error | TODO |
| 4.2 | Join Room (`/join/<code>`) | Join Code input; signed-in joins as self; Guest enters display name (2–32) + College | TODO |
| 4.3 | Join errors | Invalid code, Room full (50), Lobby expired, Room finished | TODO |
| 4.4 | Participant Lobby | Live Participant list and count, rules card, "Waiting for the Host" | TODO |
| 4.5 | Late join | "You'll join from the next Question", starts at 0 | TODO |
| 4.6 | Host Lobby (projector) | Large Join Code, copyable link, QR, large count and list, Start | TODO |
| 4.7 | Rules page (`/rules`) | Same content as the Lobby rules card | TODO |

## Step 5 — Live Rounds & Server-Authoritative Scoring · [#5](https://github.com/codesuke/AptiQuiz/issues/5)

Kit: `aptiquiz-match-kit/`

| # | Screen | Notes | Status |
|---|---|---|---|
| 5.1 | Question open (Participant) | Countdown, Question n/N, Topic, text, options; image and table variants | TODO |
| 5.2 | Answer received | Locked choice, "Answer received", answered count — no correctness shown | TODO |
| 5.3 | Time up, no answer | — | TODO |
| 5.4 | Reveal (Participant) | Correct option, your choice ✓/✗, explanation, Round points, response time | TODO |
| 5.5 | Host Question view (projector) | Question, countdown, live answered count | TODO |
| 5.6 | Host reveal controls | Advance to Leaderboard, 10-second auto-advance indicator | TODO |
| 5.7 | Answer rejected | Late or duplicate answer typed-error message | TODO |

## Step 6 — Reconnection & Resume · [#6](https://github.com/codesuke/AptiQuiz/issues/6)

Kit: `aptiquiz-match-kit/` — states over step 4–5 screens, not new pages.

| # | Screen | Notes | Status |
|---|---|---|---|
| 6.1 | Reconnecting overlay | "Rejoining… your score is safe" | TODO |
| 6.2 | Resumed after answering | Question with "Answer received" restored | TODO |
| 6.3 | Playing in another tab | Old tab, can no longer answer | TODO |
| 6.4 | Can't resume | Finished or expired Room, forged token | TODO |

**Steps 1–6 complete the acceptance journey. Steps 7 and 8 complete the MVP feature set.**

## Step 7 — Leaderboard & Final Results · [#7](https://github.com/codesuke/AptiQuiz/issues/7)

Kit: `aptiquiz-match-kit/`

| # | Screen | Notes | Status |
|---|---|---|---|
| 7.1 | Round Leaderboard (Participant) | Top 10 + own row pinned, movement up N / down N / new | TODO |
| 7.2 | Round Leaderboard (Host projector) | Top 10, climbers highlighted, animated reorder, advance control | TODO |
| 7.3 | Final results | Rank, score, accuracy %, average response time, Topic bars (Strongest / Needs work) | TODO |
| 7.4 | Per-Question review | Your answer, correct answer, explanation | TODO |
| 7.5 | League impact block | "+N to College", Not counted: Guest, Not counted: fewer than 3 verified players, Held: College pending approval | TODO |
| 7.6 | Final standings (Host projector) | Podium + full standings | TODO |
| 7.7 | Match history | Signed-in User list; Guest result link view | TODO |

## Step 8 — College League · [#8](https://github.com/codesuke/AptiQuiz/issues/8)

Kit: `aptiquiz-league-kit/`

| # | Screen | Notes | Status |
|---|---|---|---|
| 8.1 | College League — Participants | This week / this month / all time; rank, name, College, score, matches played | TODO |
| 8.2 | College League — Colleges | Top-10 average; College hidden below 3 active players | TODO |
| 8.3 | Guest claim prompt | On final results: "Sign up to claim this result" | TODO |
| 8.4 | Empty League Period | — | TODO |

## Step 9 — Faculty Insights & CSV Export · [#12](https://github.com/codesuke/AptiQuiz/issues/12) · LATER

Kit: `aptiquiz-insights-kit/` · Start only after the 50-player simulation (#10) passes.

| # | Screen | Notes | Status |
|---|---|---|---|
| 9.1 | Host Room history | Finished Rooms list | LATER |
| 9.2 | Faculty Insights | Most-missed Questions (% correct / wrong / unanswered, most chosen wrong option, average time), Room Topic accuracy | LATER |
| 9.3 | Export actions | Participant CSV, per-Question CSV | LATER |

## Step 10 — Admin Console · [#9](https://github.com/codesuke/AptiQuiz/issues/9)

Kit: `aptiquiz-admin-kit/` · Last because it depends on #1, #2, #3, #4, and #8. Desktop-first is acceptable.

| # | Screen | Notes | Status |
|---|---|---|---|
| 10.1 | Admin shell and overview | Navigation for the sections below | TODO |
| 10.2 | Colleges | Pending list, approve, reject with reason, merge A into B | TODO |
| 10.3 | Users | Search, role, Home College, verified, suspend / unsuspend | TODO |
| 10.4 | Question Sets | Search, view, delete, feature / unfeature | TODO |
| 10.5 | Live Rooms | Host, count, phase, force-end | TODO |
| 10.6 | Matches | Void / unvoid League points with reason | TODO |
| 10.7 | Action log | Admin, action, target, reason, time | TODO |
| 10.8 | Ended by an Admin | Participant-facing screen, `aptiquiz-match-kit/` | TODO |

## Not in the MVP — do not mock yet

Deferred by #13: team battles, power-ups, daily challenge and streaks, seasons, adaptive difficulty, dedicated spectator mode, bulk Question import, image upload.
