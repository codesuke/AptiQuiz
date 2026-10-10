# Host and Room design references

These five generated desktop references guide the functional Host and Join journey. They preserve the shipped AptiQuiz palette and typography from [DESIGN.md](../../DESIGN.md). The images show representative content; the application renders the real Question Sets, College, Join Code, roster, and Round state.

| Screen | Reference | Primary task |
| --- | --- | --- |
| Host setup | [01-host-setup.png](01-host-setup.png) | Choose a Question Set and create a Room. |
| Lobby | [02-lobby.png](02-lobby.png) | Share the code or QR, watch players arrive, and start. |
| Live Round | [03-live-round.png](03-live-round.png) | Follow the Question and timer, then advance after reveal. |
| Join entry | [04-join-entry.png](04-join-entry.png) | Enter the Host's six-character code. |
| Player Lobby | [05-player-lobby.png](05-player-lobby.png) | Confirm the joined identity and wait for the Host. |

## Extracted visual rules

- Warm ivory canvas, forest focal panel, orange for the primary action and live Question emphasis.
- Georgia display type for page statements; compact sans for controls and readable live information; monospace only for codes, labels, and time.
- The lobby join code is the strongest element, followed by the QR/link and then the live roster and Start action.
- A live Round gives the Question and countdown the widest column. The Room code and roster become supporting context.
- Thin rules group related information. Controls stay at least 44px high, and state is expressed in text as well as color.
- On narrow screens the columns stack in reading order, with sharing first in the Lobby and the Question first during play.
- The Join Code is one accessible input in the implementation. The generated entry reference depicts six visual boxes, but a single field better supports paste and assistive technology.

## Generation prompts

1. **Host setup:** Single horizontal desktop AptiQuiz `/host` reference, editorial serif statement on warm ivory, subtle campus engraving, forest room setup panel, real selectable Question Sets, College summary, orange Create Room action; current functional state, no coming-soon copy.
2. **Lobby:** Single horizontal desktop Host Room reference, large Join Code and QR on forest, join link and sharing controls, pale live roster, scoring explanation, clear Start match action, connected state.
3. **Live Round:** Single horizontal desktop Host Room reference during a Round, editorial heading, prominent Question and countdown, read-only options, supporting Room code and roster, next-Question affordance after reveal.
4. **Join entry:** Single horizontal desktop `/join` reference, editorial ivory statement, campus engraving, forest Join Code form, orange Find Room action, no-account note.
5. **Player Lobby:** Single horizontal desktop `/join/[code]` reference after a player joins, forest identity strip, waiting state, live roster, scoring rule, and Room facts.

The generated examples sometimes include sample options that the product does not provide, such as social network share buttons or an invented scoring rule. The implementation follows the current game contracts and uses the browser's native Share action and actual server scoring policy.
