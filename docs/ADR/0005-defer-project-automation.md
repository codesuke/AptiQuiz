# Defer Project Automation

Starter-Pack ships no package-manager manifest, Git hooks, formatter configuration, dependency automation, security-scanning workflow, or CI/CD workflow. Each generated project adds automation only after its stack, deployment model, and risk profile are known.

## Status

accepted

## Considered Options

- Ship generic Husky, lint-staged, and Prettier configuration plus placeholder GitHub Actions and Dependabot configuration.
- Ship no automation and make project-specific setup an explicit bootstrap decision (chosen).
- Generate automation through a stack-selection scaffolding CLI.

## Consequences

- Generated projects do not inherit irrelevant package-manager or GitHub Actions assumptions.
- Bootstrap requires an explicit tooling decision before development checks can be automated.
- Repository skills may help configure tooling when requested, but their presence does not install or enable it.
