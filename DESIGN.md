---
version: "aptiquiz-design-reference"
name: "AptiQuiz Design System"
description: "AptiQuiz uses an energetic, focused interface for live aptitude competition, Question Sets, Rooms, Leaderboards, and College Leagues. The reference demonstrates typography, component hierarchy, and responsive composition."
colors:
  primary: "#E65C00"
  action: "#B84700"
  action-hover: "#993A00"
  secondary: "#FDFBF7"
  accent: "#FFB380"
  background: "#FDFBF7"
  surface: "#F7F4EB"
  text-primary: "#111827"
  text-secondary: "#4B5563"
  border: "#E5E7EB"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "64px"
    fontWeight: 500
    lineHeight: "1.04"
    letterSpacing: "0"
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.6"
  label-md:
    fontFamily: "JetBrains Mono"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "1.2"
spacing:
  base: "8px"
  gap: "16px"
  card-padding: "24px"
  section-padding: "80px"
rounded:
  card: "16px"
  control: "8px"
  pill: "9999px"
components:
  card:
    background: "Use the surface token with subtle borders and HTML-matched shadow depth"
    radius: "Match the declared card radius token"
  button:
    background: "Use primary or accent colors for the main action"
    radius: "Use the control or pill radius based on the source HTML"
---
# AptiQuiz Design System
Reference: [AptiQuiz design reference](reference.html).
Tags: live competition, aptitude practice, question sets, rooms, leaderboards, college leagues.
## Overview
AptiQuiz turns placement aptitude practice into a fair live competition. Its focused, energetic interface supports Question Sets, Rooms, Leaderboards, and College Leagues while preserving the reference's typography, component hierarchy, and responsive composition.

Use AptiQuiz as the product name throughout this reference. Write direct, energetic, precise, and encouraging interface copy using the domain terms in `CONTEXT.md`. The HTML is a visual reference; its controls illustrate component styling.
## Composition
Use `reference.html` as the visual source of truth. Preserve the visible hierarchy, first-screen composition, section rhythm, density, and interaction tone before adapting copy or content.
Key visible headings include: Run live AptiQuiz Rooms; AptiQuiz match center; Question Sets; Race the clock; Build your next Question Set.
## Colors
Anchor the palette in primary #E65C00, secondary #FDFBF7, accent #FFB380, background #FDFBF7, surface #F7F4EB, text-primary #111827. Keep background, surface, text, and border roles distinct so generated layouts retain the same contrast pattern as the source.
## Typography
Use Inter for display moments and Inter for body copy unless the HTML clearly demands a compatible fallback. Labels and technical metadata should use JetBrains Mono or an equivalent mono face.
## Layout
Keep spacing deliberate and stable. Favor the same grid direction, max-width behavior, card density, and responsive stacking seen in the HTML. Do not replace distinctive source structures with generic SaaS sections.
## Components
Use the Q/check logo assets and usage rules in [Brand.md](Brand.md). Current branding takes precedence over the older marks in generated screen references. Preserve its aspect ratio and accessible naming.

The authentication prototype and design reference use a darker orange action token, #B84700, for small link text and buttons with white labels to meet WCAG AA contrast; #993A00 is the hover fill. The primary brand orange remains #E65C00 for the logo and decorative emphasis.

Room lookup, Question Set actions, and live-match controls should preserve the reference button hierarchy, input density, and clear focus states.
## Motion
Preserve existing motion cues such as masked reveals, staggered entrance, hover lift, scroll-triggered transitions, and ambient movement. Keep easing smooth and restrained.
## WebGL & Effects

If the source includes canvas, WebGL, Three.js, gradients, particles, or atmospheric effects, rebuild them as supporting layers behind the content. Keep effects performant, responsive, and secondary to the interface.

## Guardrails
- Do not flatten the source into a generic card grid.
- Do not swap the color mode unless the source clearly supports it.
- Preserve the first viewport signal, focal object, and visual density.
- Keep buttons, cards, and badges aligned to the same radius and border language.
