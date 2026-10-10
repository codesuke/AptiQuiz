# AptiQuiz authentication UI kit

![AptiQuiz](../../Apti-App/apps/web/public/brand/aptiquiz-logo-readme.png)

These browser-openable prototypes follow the current AptiQuiz auth shell in `Apti-App/apps/web`: the Q/check logo, ivory page, cream illustration panel, 58/42 desktop split, 400px form column, and AptiQuiz copy. The form controls and state pages are visual previews. They do not authenticate or send email.

## Open the prototypes

Open [normal login](prototypes/normal-login.html) directly in a browser. Its links lead to the other local pages. Styles, scripts, icons, and brand images use local files. Inter and JetBrains Mono load from Google Fonts, with system fallbacks offline.

| Flow | Prototype |
| --- | --- |
| Email sign-in | [Normal](prototypes/normal-login.html), [loading](prototypes/login-loading.html), [error](prototypes/login-error.html) |
| Account creation | [Sign up](prototypes/sign-up.html) |
| Google sign-in | [OAuth](prototypes/oauth-login.html) |
| Password recovery | [Request](prototypes/forgot-password.html), [email confirmation](prototypes/reset-email-confirmation.html), [new password](prototypes/reset-password.html), [success](prototypes/password-reset-success.html), [expired link](prototypes/expired-reset-link.html) |

The live web app currently implements email sign-in and sign-up. Google sign-in and password recovery are prototype states for planned flows. The Google button and sign-up form show local preview feedback. Other form submissions move between local pages. The prototype sends no entered details to a server and clears passwords before transitions.

The shared style is [auth-layout.css](prototypes/auth-layout.css), the shared interaction script is [auth-preview.js](prototypes/auth-preview.js), and the palette and sizing tokens are in [auth.css](tokens/auth.css). The brand images come from `Apti-App/apps/web/public/brand/` per [Brand.md](../../Brand.md). The original screen PNG and older prototype screenshots under `screens/` are historical references and do not depict these updated pages.

The kit uses only Google as the planned social provider, consistent with [ADR 0007](../../docs/ADR/0007-better-auth-and-socket-tickets.md). It does not include Microsoft or a separate administrator sign-in. Regenerate the [asset manifest](manifest.json) after changes with `node prototypes/update-manifest.mjs`.
