# QnA

Store decision sessions here only when the user explicitly asks for a durable QnA record. The default `/grilling` workflow stays in the conversation and hands its settled summary to `/to-specs`.

Each session should capture the questions asked, the recommended answer, the user's answer, and the settled outcome. If the session resolves glossary language, update `CONTEXT.md`. If it produces a durable architectural decision, create an ADR in `docs/ADR/`.
