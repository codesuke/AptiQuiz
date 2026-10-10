# AptiQuiz Question Sets design

Generated reference screens for the Question Set authoring flow:

- `01-library.png` — library and create form
- `02-set-detail.png` — ordered questions and add form
- `03-edit-question.png` — focused edit form and saved-question reference
- `04-notebook-asset.png` — separate still-life source used in the library hero
- `implemented-library-desktop.png` and `implemented-library-mobile.png` — baseline library captures before the typography and layout refresh
- `implemented-detail-desktop.png` and `implemented-detail-mobile.png` — baseline owned-set captures
- `implemented-edit-desktop.png` and `implemented-edit-mobile.png` — baseline edit captures

The implementation uses the shipped AptiQuiz logo and the palette and type roles in `DESIGN.md`. It follows the references' editorial heading scale, ruled list layout, forest starter row, pale composer, and compact answer controls. These are visual references, so generated placeholder data, search tabs, and unsupported actions are excluded. The edit side panel explicitly shows the **saved** question; it does not claim live preview or autosave.

The corresponding implementation is in `Apti-App/apps/web/src/app/question-sets/`. All authoring actions remain the existing server actions. The set detail page carries its selected set into the hosting setup when the User has a Home College.

The detail and edit screens use the references' continuous pale right workspace. The library hero uses a standalone study image generated from the `01-library.png` scene. Question Set screens load a local Inter face for body text and use Georgia with a bundled Gelasio fallback for display text, so the type hierarchy remains readable on systems without those fonts installed. The bundled font licenses are in `Apti-App/apps/web/public/fonts/`.
