# Blockchain Conventions

Agent-facing, security-grounded checklist for blockchain/smart-contract projects built from this template, covering concerns `docs/agents/stack-conventions.md` doesn't reach. Additive, not a replacement — import both if the project is also a chosen web/backend stack. Grounded in [`docs/Research/blockchain-conventions.md`](../Research/blockchain-conventions.md).

Blockchain mistakes are unusually costly and hard to reverse once deployed. The rules below are hard constraints, not suggestions.

## Upgrade Safety (Hard Constraints)

- No constructors in upgradeable contracts. Use an initializer function gated by `Initializable`'s `initializer` modifier (parent contracts use `onlyInitializing`).
- Storage layout is append-only across an upgrade: never reorder, retype, or delete an existing state variable, and never reorder parent-contract inheritance. New variables go at the end only.
- Set non-constant variable values in the initializer, not in field declarations.
- Never use `selfdestruct` or an unchecked `delegatecall` in upgradeable contract code.
- Reserve expansion room in base contracts with a `__gap` fixed-size array; shrink the gap as you consume it.
- Call `_disableInitializers()` in the implementation contract's constructor — an uninitialized implementation is a takeover vector.
- Use `@openzeppelin/contracts-upgradeable`, not `@openzeppelin/contracts`, for upgradeable deployments.

## Pre-Audit Checklist

Before a contract feature counts as done:

- Static analysis (Slither) clean, or every finding triaged and justified.
- Test coverage threshold met (`forge coverage`).
- For anything holding real value, or touching a proxy's storage: a manual pass through the known-attacks list — reentrancy, oracle manipulation, front-running, timestamp dependence, integer overflow, denial-of-service via gas/reverts.

## Key Management

| Environment | Key source |
| --- | --- |
| Local | Anvil's pre-funded default accounts |
| Testnet | Encrypted keystore (`cast wallet import`) |
| Mainnet | Hardware wallet + multisig (e.g. Safe), ideally behind a `TimelockController` |

Never hardcode or commit a private key or seed, regardless of environment. Never use Anvil's default keys on a public network — they're publicly known.

## Deployment Scripts

- One script per concern (`DeployToken.s.sol`, `ConfigureVault.s.sol`, …), not one monolith.
- Number scripts when order matters (`01_Deploy.s.sol`, `02_TransferOwnership.s.sol`).
- Scripts read config from environment variables only — never a hardcoded address or key.
- Test a deploy script the same way as a contract: scaffold tests against the state it produces, and run the full suite before it touches a real network.
- The only sanctioned path to a live network is the standard verify-and-broadcast command (`forge script ... --broadcast --verify`, or the Hardhat equivalent) — no manual or ad hoc deploys.

## Dependency Pinning

- Exact-pin on-chain dependencies (`--save-exact`), never a range.
- Install from tagged releases only — never a git `master`/`main` branch.
- Treat a major-version bump of any on-chain dependency as storage-layout-breaking. Review it with the same rigor as a first-time upgrade.

## Pause / Incident Response

Before a contract holding user value ships, decide and document:

- Is it pausable, and by whom.
- A runbook stub: who to contact, how to pause, how to verify a fix.

Don't improvise incident response for the first time during an actual incident.

## Oracle Usage

If the project touches a price or data feed: default to a decentralized, staleness-checked feed (e.g. Chainlink Data Feeds) over a single-source read. Require staleness/deviation checks — never trust a raw spot price.

## Tooling Baseline

- Primary dev loop: Foundry (`forge test`, `forge coverage`, `forge script`).
- Static analysis in CI: Slither.
- Formal verification (e.g. Certora): opt-in only, for protocols whose risk profile warrants it — not a default requirement.
