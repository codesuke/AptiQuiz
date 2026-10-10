---
version: "aptiquiz-home-standard-v1"
name: "AptiQuiz Design System"
description: "The shipped home page defines the visual language for new and refreshed AptiQuiz interfaces."
colors:
  primary: "#E65C00"
  action: "#B84700"
  action-prominent: "#C84F00"
  action-prominent-hover: "#A63F00"
  action-hover: "#993A00"
  background: "#FDFBF7"
  surface: "#F5F3EB"
  hero-surface: "#F6F0E4"
  ink: "#15372D"
  ink-deep: "#102E26"
  ink-footer: "#123B2E"
  text-muted: "#4C6257"
  text-on-dark: "#D7E4DA"
  rule: "#D7DACF"
typography:
  display:
    fontFamily: "Georgia, Times New Roman, serif"
    fontWeight: 400
    letterSpacing: "-0.055em"
  body:
    fontFamily: "Inter, system sans-serif"
    fontSize: "16px"
    lineHeight: "1.6"
  label:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
    fontSize: "11px"
    fontWeight: 600
spacing:
  base: "8px"
  desktop-gutter: "40px"
  mobile-gutter: "20px"
  content-width: "1420px"
  desktop-section: "105px to 125px"
  mobile-section: "78px"
rounded:
  functional-control: "8px"
  action-pill: "9999px"
---

# AptiQuiz Design System

## Source of truth

The [implemented desktop home page](design-mocks/aptiquiz-home-premium/implemented-desktop.png) and [mobile home page](design-mocks/aptiquiz-home-premium/implemented-mobile.png) are the canonical visual reference for new and refreshed AptiQuiz screens. The [six section mocks](design-mocks/aptiquiz-home-premium/README.md) explain the art direction; the shipped interface takes precedence when a mock differs. Use the CSS custom properties in [globals.css](Apti-App/apps/web/src/app/globals.css) and the layout examples in [home-screen.module.css](Apti-App/apps/web/src/components/home-screen.module.css). [Brand.md](Brand.md) controls logo, voice, and naming.

This standard applies to the app's visual language, not the literal marketing-page composition. A dense Question editor or live Round needs more compact controls than the home hero, while retaining its typography hierarchy, spacing rhythm, colors, and calm use of surfaces.

## Visual character

AptiQuiz is warm, focused, and energetic. Warm ivory carries most screens; deep forest green provides the strongest contrast; orange marks action and progress. Paper, answer sheets, pencils, and shared study give imagery a tangible subject. Use one focal scene or artifact at a time. Avoid generic dashboards, purple gradients, decorative blobs, fake metrics, and card grids with no content reason.

## Color roles

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#FDFBF7` | Default page background |
| Quiet surface | `#F5F3EB` | Secondary zones and functional panels |
| Hero surface | `#F6F0E4` | Warm image-backed opening scenes |
| Ink | `#15372D` | Main headings and text on light backgrounds |
| Deep ink | `#102E26` | Immersive feature areas |
| Brand orange | `#E65C00` | Logo and decorative punctuation |
| Action orange | `#B84700` | Small buttons and links with accessible contrast |
| Prominent action | `#C84F00` | Large primary action on light backgrounds |
| Action hover | `#993A00` | Hover fill for action controls |
| Prominent hover | `#A63F00` | Hover fill for the large orange action |
| Muted text | `#4C6257` | Supporting copy on ivory |
| Text on dark | `#D7E4DA` | Supporting copy on forest surfaces |
| Rule | `#D7DACF` | Hairline dividers and open grids |

The orange `#E65C00` is a brand accent, not the default small-text color. Check contrast for each text and surface pair. Keep a visible keyboard focus outline and never convey game state through color alone.

## Typography

- **Display:** Georgia with Times New Roman fallback, regular weight, tight tracking around `-0.055em`. Use it for the page statement, section titles, and a few key feature headings. The home hero uses `clamp(4rem, 6.1vw, 7.25rem)` at `0.98` line height; section titles use `clamp(3.2rem, 5vw, 6rem)` at `1.08`. On mobile, fit the line breaks deliberately at the 390px reference width.
- **Body and controls:** Inter with system sans fallback. Use 16px and about `1.6` line height for normal copy; important introductions can use 18–22px. Keep body lines within roughly 570–760px rather than running across the page.
- **Labels:** A restrained monospace face at 11–13px, medium to semibold, with generous tracking. Use uppercase labels for section wayfinding and technical metadata, not for long prose or every control.
- **Hierarchy:** One clear H1 per screen. Use display scale selectively; forms, question options, timers, and error messages prioritize fast reading over theatrical type.

Do not substitute a heavy sans heading system, gradient headline, or a different serif on a new screen without a specific design reason.

## Spacing and layout

- Use a maximum content width of 1420px with 40px desktop side gutters and 20px mobile gutters. A hero may use a wider 1510px inner frame. Preserve safe text insets over images.
- Give major editorial sections about 105–125px of vertical space on desktop and about 78px on mobile. Inside a section, keep the relationships visible on the home page: label to title about 19–28px, title to introduction about 24–32px, and copy to action about 30–45px.
- Alternate section density and background treatment with purpose: an open ivory section, one dark focal section, a precise divided process, an image-led story, then a decisive action. Do not repeat the same card row down a page.
- Use thin rules and open columns before adding enclosing boxes. Reserve bordered panels for actual tasks, state, or controls. Avoid cards inside cards.
- At 760px and below, stack editorial columns, keep the 20px gutter, and preserve the text-first reading order. Check at 390px and a small laptop viewport. No horizontal scrolling.

For in-app workflows, use this spacing rhythm at a smaller scale: generous page framing and clear group separation, with compact, consistent spacing inside inputs, Question options, and Lobby controls.

## Components and imagery

- **Primary action:** one unmistakable filled action per decision area. The home page uses a large orange pill with a 55–60px minimum height and 18–20px type. Functional forms may use an 8px control radius when a pill would waste space.
- **Secondary action:** underlined text with a small arrow, never a second equally loud filled button. Keep keyboard targets at least 44px high.
- **Panels and cards:** forest panels can carry one important action or state; neutral panels support forms. Let content determine padding and grouping instead of decorating every item.
- **Imagery:** use AptiQuiz-specific, warm, tactile photos or illustrations. Keep visible copy as HTML, give informative images useful alt text, and mark purely decorative art as decorative. Use the approved [Q/check logo](Brand.md) without redrawing it.
- **Motion:** restrained hover lift and transitions may support hierarchy. Honor reduced-motion preferences. Motion never hides an action or delays a live-game state.

## Applying the standard

When designing a new screen, start from the home page's palette, type roles, page gutters, spacing cadence, and action hierarchy. Then adapt density to the task. Compare a desktop and a 390px mobile capture with the canonical references before considering it done. Preserve the implemented domain behavior and terms in [CONTEXT.md](CONTEXT.md); visual polish must not imply an unfinished feature is available.
