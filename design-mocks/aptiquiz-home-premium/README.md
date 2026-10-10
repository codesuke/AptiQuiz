# Premium home page design

This shipped home page is the canonical visual reference for new and refreshed AptiQuiz screens. [DESIGN.md](../../DESIGN.md) defines how its typography, spacing, layout rhythm, and component language carry through the application.

Six standalone horizontal section references generated with the `imagegen-frontend-web` workflow:

1. [Hero](01-hero.png)
2. [Ways in](02-ways-in.png)
3. [Question Sets](03-question-sets.png)
4. [How it works](04-how-it-works.png)
5. [College community](05-college.png)
6. [Closing call to action and footer](06-cta-footer.png)

Rendered implementation checks: [desktop](implemented-desktop.png) and [mobile](implemented-mobile.png).

The design uses warm ivory, deep forest green, and AptiQuiz orange. Its visual spine is tactile practice material: paper, answer sheets, pencils, and shared study. Editorial serif headlines contrast with plain body copy and small mono labels. Sections alternate between open ivory, dark green, photography, and orange, with generous space and thin rules.

The implementation is in `Apti-App/apps/web/src/components/home-screen.tsx` and `home-screen.module.css`. Separate artwork without baked-in copy lives in `Apti-App/apps/web/public/images/home/`. The live page uses the approved AptiQuiz logo, real links, and selectable text; the generated images are visual references rather than flattened UI. Generated reference copy about completed live play was adjusted to match the current product state.
