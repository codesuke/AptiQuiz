# .design-engineer

Working directory for the `design-engineer` skill suite (`de-recon`, `de-growth`, `de-direction`, `de-motion`, `de-handoff`, orchestrated by `design-engineer`). Populated automatically when those skills run against a feature in this project — nothing needs to be created here manually.

## Layout

```text
.design-engineer/
└── <project-slug>/
    ├── recon.md          # de-recon — content/competitive inventory
    ├── growth.md          # de-growth — conversion doctrine, the ONE locked CTA
    ├── direction.md        # de-direction — visual/art direction, taste-calibrated
    ├── motion.md            # de-motion — motion/interaction spec
    ├── master-brief.md       # SYNTHESIZE — tensions resolved per doctrine order
    └── prompt-pack.md          # de-handoff — the final build-ready brief
```

`<project-slug>` is the kebab-case name of the feature or page being designed (e.g. `login-page`), reused across every phase for that feature. Multi-page work adds a `pages/<page-slug>/` subfolder per page under the shared recon/growth/direction.

## Rules

- Never hand-edit these files directly — re-run the relevant `de-*` phase instead, so upstream/downstream artifacts stay consistent.
- Don't delete a completed phase's file to force a re-run; the orchestrator does resume detection and will ask before overwriting.
- These are working artifacts, not the source of truth for shipped product decisions — once a design ships, the durable summary belongs in `DESIGN.md`, and any hard-to-reverse decision it produced belongs in `docs/ADR/`.
