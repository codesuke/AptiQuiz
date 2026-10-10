# AptiQuiz Question Sets design

Generated reference screens for the Question Set authoring flow:

- `01-library.png` — library and create form
- `02-set-detail.png` — ordered questions and add form
- `03-edit-question.png` — focused edit form and saved-question reference
- `04-notebook-asset.png` — separate still-life source used in the library hero
- `implemented-library-desktop.png` and `implemented-library-mobile.png` — rendered library
- `implemented-detail-desktop.png` and `implemented-detail-mobile.png` — rendered owned set
- `implemented-edit-desktop.png` and `implemented-edit-mobile.png` — rendered edit screen

The implementation uses the shipped AptiQuiz logo and the palette and type roles in `DESIGN.md`. It follows the references' editorial heading scale, ruled list layout, forest starter row, pale composer, and compact answer controls. These are visual references, so generated placeholder data, search tabs, and unsupported actions are excluded. The edit side panel explicitly shows the **saved** question; it does not claim live preview or autosave.

The corresponding implementation is in `Apti-App/apps/web/src/app/question-sets/`. All authoring actions remain the existing server actions. The set detail page carries its selected set into the hosting setup when the User has a Home College.
