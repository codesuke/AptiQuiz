# Architecture

Repo layout and where new code belongs for {Project Name}.

## File Structure

```text
/
├── CONTEXT.md
├── Brand.md
├── DESIGN.md
├── Architecture.md
├── AGENTS.md / CLAUDE.md
├── {app or src directory}/
└── docs/
    ├── ADR/
    ├── QnA/
    ├── Specs-Completed/
    ├── build-memory.yaml
    ├── Templates/
    └── agents/
```

{Replace the `{app or src directory}/` line above with the project's actual top-level source layout once the stack is chosen, and expand it the way ListItUp's Architecture.md documents `client/` — import alias conventions, where routes/components/shared logic live, etc.}

## Import & Module Conventions

{Path aliases, module boundaries, what's allowed to depend on what.}

## Where New Code Belongs

{A short decision guide: "a new API endpoint goes in X", "shared logic goes in Y", etc.}

## Data Layer

{Database, ORM/migration tooling, and the rule for how schema changes are made — see ListItUp's AGENTS.md for the pattern of treating a schema file as the single source of truth and never hand-editing generated migrations.}
