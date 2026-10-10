# Stack-Agnostic Operating System

Starter-Pack keeps a durable, in-repo "operating system" for building with AI agents — root context files (`CONTEXT.md`, `Brand.md`, `DESIGN.md`, `Architecture.md`), `AGENTS.md`, and a `docs/` tree for QnA, specs, ADRs, templates, and agent configuration — but keeps it stack-agnostic. Stack-specific rules (a Next.js/TypeScript conventions doc, for example) live in a single placeholder slot (`docs/agents/stack-conventions.md`) filled in per project, rather than being baked into the template.

## Status

accepted

## Considered Options

- Stack-agnostic core with a placeholder conventions slot (chosen).
- Next.js/TypeScript-opinionated template, matching the dominant stack in practice (ListItUp).
- A scaffolding CLI that prompts for stack and generates the right files.

## Consequences

- New projects on an unfamiliar stack (a Python API, a CLI tool) don't have to strip out irrelevant conventions before they're useful.
- Every new project pays a small one-time cost of filling in `docs/agents/stack-conventions.md` — tracked in `BOOTSTRAP.md`.
- The template stays useful even as the dominant stack changes over time.
