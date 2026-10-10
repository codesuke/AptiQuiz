# AptiQuiz design mocks

![AptiQuiz](../Apti-App/apps/web/public/brand/aptiquiz-logo-readme.png)

Use the shared [brand assets](../Apti-App/apps/web/public/brand/) and [logo usage rules](../Brand.md). The [logo source and prompts](aptiquiz-logo/README.md) preserve generation provenance.

Store each UI area as a self-contained kit. Start with [the AptiQuiz authentication kit](aptiquiz-auth-kit/README.md). Build screens in the order set by [SCREEN-BUILD-ORDER.md](SCREEN-BUILD-ORDER.md).

The [Home College screen reference](aptiquiz-college-kit/README.md) shows the current `/college` redesign.

Each kit includes screen references, exact generation prompts, reusable assets, CSS tokens, browser-openable prototypes, and a generated asset manifest. Only include screens and assets that exist; extend the kit as further mocks are created.

`auth-kit/` is a temporary reference from another project. AptiQuiz's kit has no dependency on it and it can be removed independently.
