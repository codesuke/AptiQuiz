# Research: Blockchain / Smart-Contract Agent Conventions

Research for GitHub issue #14 on `VirtuNode-dev/Starter-Pack`. The question: what do
real-world blockchain / smart-contract projects need documented as agent-facing
conventions, beyond a normal `stack-conventions.md` (rendering/data-fetching/caching for
a typical web stack)? Findings below are drawn only from primary/official sources —
each claim is cited inline with the URL it came from. This file does not decide whether
Starter-Pack should add a `docs/agents/blockchain-conventions.md`; see the
Recommendation section at the end for what such a doc would need to cover if the
project chooses to add one.

## 1. Audit / security checklists for smart contracts

- ConsenSys Diligence's security guide frames blockchain development as categorically
  different from normal software: "prepare for failure" as a mindset, because "the cost
  of failure can be high, and change can be difficult." It recommends staged rollout —
  bug bounty programs before mainnet, and gradual increases in value/exposure limits
  rather than launching at full scale — plus favoring simplicity over complexity because
  complex code is harder to audit. ([General Philosophy](https://consensysdiligence.github.io/smart-contract-best-practices/general-philosophy/))
- The same guide catalogs known attack classes agents should check against when writing
  or reviewing contract code: reentrancy (checks-effects-interactions pattern),
  oracle manipulation (diversify sources, use time-weighted prices), frontrunning
  (commit-reveal, private mempools), timestamp dependence, integer overflow/underflow
  (Solidity 0.8+ checked arithmetic or SafeMath), denial-of-service via unexpected
  reverts/gas limits (pull-payment pattern), griefing, and force-feeding ETH balances.
  ([Known Attacks index](https://consensysdiligence.github.io/smart-contract-best-practices/attacks/))
- Trail of Bits' `building-secure-contracts` repo (crytic org) structures its guidance
  into four parts: Development Guidelines, Learn EVM, Not So Smart Contracts (a
  vulnerability catalog), and Program Analysis (tool training for Echidna, Slither,
  Manticore/Medusa). Its Development Guidelines section includes a "code maturity"
  rubric for evaluating how audit-ready a codebase is, a token integration checklist
  for verifying third-party token behavior, and a documented secure development
  workflow. ([crytic/building-secure-contracts](https://github.com/crytic/building-secure-contracts))
- Slither (Trail of Bits) is the reference static analyzer: it ships ~100 detectors
  split by severity — high-impact (uninitialized state variables, reentrancy,
  unprotected upgrade functions, suicidal/selfdestruct-reachable functions),
  medium-impact (controlled delegatecalls, arbitrary token transfers, weak randomness,
  timestamp dependence), and low/informational checks. It runs directly against
  Hardhat, Foundry, Dapp, and Brownie projects (`slither .`) and has an official GitHub
  Action for CI, plus a `--checklist` markdown-report mode and a dedicated
  `slither-check-upgradeability` mode for proxy-based contracts.
  ([crytic/slither](https://github.com/crytic/slither))

## 2. Upgrade / migration patterns for on-chain code

- OpenZeppelin's Upgrades Plugins documentation states the core upgrade-safety rules
  for proxy-based contracts:
  - No constructors — use initializer functions gated by the `Initializable` base
    contract's `initializer` modifier (parent contracts use `onlyInitializing`).
  - Storage layout is load-bearing: "you cannot change the order in which the contract
    state variables are declared, nor their type" across an upgrade — this covers
    variable order, type, insertion before existing variables, deletion, and even
    reordering of parent-contract inheritance. New variables must be appended at the end.
  - Don't set initial values in field declarations for non-constant variables; set them
    in the initializer instead.
  - Never use `selfdestruct` or arbitrary `delegatecall` in upgradeable contract code.
  - Reserve expansion room in base contracts with a `__gap` fixed-size array so that
    adding variables to a base contract later doesn't corrupt child-contract storage
    (shrink the gap as you consume it).
  - Don't leave the implementation contract itself uninitialized — call
    `_disableInitializers()` in its constructor to prevent takeover.
  - Use `@openzeppelin/contracts-upgradeable`, not the standard `@openzeppelin/contracts`
    package, for upgradeable deployments (the standard package's constructors are
    incompatible with proxy patterns).
  ([Writing Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable))
- The plugins also validate storage-layout compatibility automatically on every upgrade
  by comparing the current and new implementation's layouts, and expose (dangerous,
  last-resort) escape hatches `unsafeAllowRenames` and `unsafeSkipStorageCheck`.
  Namespaced storage layouts (`@custom:storage-location`, Solidity ≥0.8.20) are
  supported and validated under the same modification rules.
  ([Upgrades Core & CLI](https://docs.openzeppelin.com/upgrades-plugins/api-core))
- Note: major-version upgrades of OpenZeppelin's own libraries are explicitly *not*
  storage-compatible — e.g. "it is unsafe to upgrade from 4.9.3 to 5.0.0" — which ties
  upgrade safety directly to the dependency-pinning discipline in section 5 below.
  ([npm/versioning guidance](https://github.com/OpenZeppelin/openzeppelin-contracts-docs/blob/master/demo-docs/get-started.md))
- Mechanically, delegatecall-based proxies run the implementation's bytecode against
  the *proxy's* storage slots — the proxy and implementation "must agree on what lives
  in every slot, and they have no shared compiler to enforce it," which is the root
  cause of storage-collision bugs, and an uninitialized or selfdestructed
  implementation can let an attacker take control of the proxy.
  ([storage collision background — secondary but corroborates the mechanism described in OpenZeppelin's own docs above](https://mixbytes.io/blog/collisions-solidity-storage-layouts))

## 3. Key management conventions

- Foundry's own "Scripting Practices" guide is explicit and opinionated about key
  handling: "Never hardcode addresses or keys in scripts" — use `vm.envAddress()` /
  `vm.envOr()` for runtime config, ship a `.env.example` documenting required
  variables, and never commit real `.env` files. It recommends a *tiered* key strategy
  by environment:
  - Local: Anvil's pre-funded default accounts.
  - Testnet: encrypted keystores via `cast wallet import`.
  - Mainnet: hardware wallets exclusively.
  It explicitly warns: "Never use Anvil's default keys on public networks. They are
  publicly known." ([Scripting Practices](https://getfoundry.sh/guides/best-practices/writing-scripts/))
- OpenZeppelin's access-control docs recommend moving beyond a single EOA `owner` for
  privileged roles: use `AccessControl` for role-based least-privilege permissions
  (e.g. separate roles for banning vs. minting), and prefer a *contract* as the
  privileged account — a multisig (Gnosis Safe) or a DAO — over an individual key.
  MakerDAO is cited as a project already using this pattern.
  ([Access Control](https://docs.openzeppelin.com/contracts/5.x/access-control))
- OpenZeppelin further recommends `TimelockController` for critical operations: it
  forces a mandatory delay before a sensitive action executes, so affected users have
  a window to review and exit if they disagree with the change. The recommended
  composition is timelock (delay) + multisig (execution) together — neither party
  alone can act unilaterally. ([Access Control](https://docs.openzeppelin.com/contracts/5.x/access-control))
- Trail of Bits' incident-response guidance ties key management to incident
  preparedness directly: implement "fine-grained access controls through multisig
  wallets rather than single EOAs," decide in advance which components must be
  pausable/upgradeable/decentralized, and document wallet-access and
  pause/rotation/upgrade runbooks *before* an incident happens.
  ([Incident Response](https://github.com/crytic/building-secure-contracts/blob/master/development-guidelines/incident_response.md))
- Safe (formerly Gnosis Safe) is the de facto standard multisig/smart-account
  infrastructure for holding privileged roles; its official docs describe it as
  providing "universal and open contract standards for the custody of digital assets,
  data, and identity" rather than relying on a single EOA's seed phrase.
  ([What is Safe](https://docs.safe.global/home/what-is-safe))

## 4. Testnet / mainnet deployment practices

- Foundry's Scripting Practices guide recommends organizing deployment scripts by
  concern rather than one monolith — e.g. `DeployToken.s.sol`, `DeployVault.s.sol`,
  `ConfigureVault.s.sol`, with a master `Deploy.s.sol` that orchestrates them — and
  prefixing scripts with an order number when they represent an ordered sequence over
  the protocol's lifecycle (e.g. `01_Deploy.s.sol`, `02_TransferOwnership.s.sol`) "to
  make things more self-documenting." Scripts should log deployed addresses, chain ID,
  and deployer identity via `console.log()` for a post-deployment audit trail.
  ([Scripting Practices](https://getfoundry.sh/guides/best-practices/writing-scripts/))
- Foundry recommends testing deploy scripts the same way you'd test contracts: "write
  your deploy script and scaffold tests by running that script," then run the full test
  suite against the state the production deploy script produces, to build confidence
  before it ever touches a real network.
  ([Best Practices](https://www.getfoundry.sh/best-practices))
- The standard verified-deployment command is
  `forge script script/Deploy.s.sol --broadcast --rpc-url $RPC_URL --verify --etherscan-api-key $ETHERSCAN_API_KEY`;
  if a broadcast fails partway through, `--resume` continues from where it left off
  rather than re-running already-broadcast transactions.
  ([Scripting — Foundry Book](https://getfoundry.sh/forge/deploying/))
- Hardhat's official `hardhat-verify` plugin (`@nomicfoundation/hardhat-verify`, bundled
  in the standard toolboxes) verifies deployed source code against a block explorer
  with `npx hardhat verify --network <network> <address> "<constructor arg>"`; it now
  uses Etherscan's v2 API (a single API key across supported chains) and also supports
  Blockscout. ([hardhat-verify](https://hardhat.org/docs/plugins/hardhat-verify))
- Environment separation follows directly from the key-management tiering in section 3:
  Anvil accounts for local, encrypted keystores for testnet, hardware wallets for
  mainnet — i.e. the deployment pipeline's trust level should scale with the network's
  real-money stakes, not use one uniform key/config path for all three.
  ([Scripting Practices](https://getfoundry.sh/guides/best-practices/writing-scripts/))

## 5. Other conventions relevant to an agent building a blockchain feature from scratch

**Dependency / library pinning.** OpenZeppelin explicitly recommends exact-version
pinning of its own library: `npm install --save-exact @openzeppelin/contracts`
(the `-E`/`--save-exact` flag), because Contracts uses semver to communicate API and
*storage-layout* backward compatibility, and storage layout across major versions
should be assumed incompatible (upgrading 4.9.3 → 5.0.0 is called out as unsafe). It
also warns against installing from a git `master` branch instead of a tagged release,
since the release process includes security steps master doesn't guarantee, and against
copy-pasting or hand-modifying vendored contract code.
([get-started guidance](https://github.com/OpenZeppelin/openzeppelin-contracts-docs/blob/master/demo-docs/get-started.md))

**Test coverage tooling.** Foundry's `forge coverage` reports line/branch coverage, can
emit a debug report pinpointing exactly which lines/branches are uncovered, and can emit
an `lcov.info` file for HTML coverage reports via `genhtml`. Options like `--ir-minimum`
and `--no-match-coverage` tune what gets measured.
([forge coverage](https://getfoundry.sh/reference/forge/coverage))

**Static analysis tooling.** Slither is the primary open static analyzer (see section 1)
and is designed to be wired into CI as a merge-time quality gate via its official GitHub
Action. Trail of Bits' `building-secure-contracts` also trains Echidna (property-based
fuzzing), Medusa, and Manticore (symbolic execution) as complementary dynamic/symbolic
tools alongside Slither's static analysis.
([crytic/building-secure-contracts](https://github.com/crytic/building-secure-contracts), [crytic/slither](https://github.com/crytic/slither))

**Formal verification.** Certora Prover is the reference tool: specifications are
written in CVL (Certora Verification Language) and checked with a mix of static
analysis and constraint solving; it has been used on production DeFi protocols (their
own materials cite Compound). This is a heavier-weight tool than Slither/Echidna and
targets protocols where correctness of core invariants is high-stakes enough to justify
writing formal specs. ([Certora Prover docs](https://docs.certora.com/), [Certora Compound verification summary](https://compound.finance/documents/Certora.pdf))

**Incident response / pause mechanisms.** Trail of Bits recommends preparing, in
advance of any incident, across four axes: (1) *application design* — decide up front
which components are pausable/upgradeable/decentralized, and enforce fine-grained
access via multisig rather than a single EOA; (2) *documentation* — a runbook of
pause/rotation/upgrade procedures, fork-tested and validated, plus a stakeholder
contact/communication plan; (3) *process* — named incident-owner roles (technical lead,
communications lead, legal lead) and monitoring/automation for protective actions;
(4) *threat intelligence* — tracking similar protocols' incidents and staying on
dependency-owner communication channels. The framing is explicit: "planning with the
assumption that incidents are inevitable."
([Incident Response](https://github.com/crytic/building-secure-contracts/blob/master/development-guidelines/incident_response.md))
ConsenSys's guide similarly recommends circuit breakers (pause), speed bumps, and rate
limiting as standard defensive precautions, alongside careful use of upgradeability,
though the individual precautions sub-page on the live site returned a 404 at fetch
time — this point is corroborated by the guide's own index/navigation structure and its
"General Philosophy" staged-rollout material.
([General Philosophy](https://consensysdiligence.github.io/smart-contract-best-practices/general-philosophy/))

**Front-running / MEV.** Covered as one of ConsenSys's cataloged known-attack classes:
transaction-ordering exploitation, mitigated with patterns like commit-reveal schemes,
private mempools/relays, and batching. ([Known Attacks index](https://consensysdiligence.github.io/smart-contract-best-practices/attacks/))

**Oracle usage conventions.** Chainlink's own docs describe Data Feeds as onchain
reference contracts updated by a decentralized oracle network (DON), aggregating many
independent node operators' data rather than a single source; some feeds run a primary
DON plus a secondary backup DON that a proxy contract can fail over to if the primary
has an issue. Chainlink's docs also flag a gas-level implementation detail: pre-warming
the aggregator's storage via an access-list transaction saves ~200 gas on the feed read.
([Chainlink Data Feeds](https://docs.chain.link/data-feeds), [Consuming Data Feeds](https://docs.chain.link/data-feeds/getting-started))
ConsenSys's oracle-manipulation guidance (section 1) is the complementary risk-side
view: diversify sources and use time-weighted/bounded prices rather than trusting a
single spot-price read.

## Recommendation

This is evidence for a downstream ADR — it lays out what a `docs/agents/blockchain-conventions.md`
would need to contain *if* the project adds one; it does not decide whether to add it.
Grounded in the sources above, such a doc should cover:

- **Upgrade safety rules as hard constraints**, not suggestions: no constructors in
  upgradeable contracts (initializers + `Initializable`/`onlyInitializing` only),
  append-only storage layout, `__gap` reservation in base contracts,
  `_disableInitializers()` on implementation contracts, and a ban on `selfdestruct`/
  unchecked `delegatecall` in upgradeable code — mirroring OpenZeppelin's Writing
  Upgradeable Contracts rules.
- **A required pre-audit checklist** an agent must run through before treating a
  contract feature as done: Slither clean (or findings triaged/justified), test
  coverage threshold met via `forge coverage`, and — for anything holding real value or
  altering a proxy's storage — a manual pass through ConsenSys's known-attacks list
  (reentrancy, oracle manipulation, front-running, timestamp dependence, integer
  overflow, DoS via gas/reverts).
- **A key-management tier table**, explicit per environment: local (Anvil default
  accounts) → testnet (`cast wallet import` encrypted keystore) → mainnet (hardware
  wallet + multisig, e.g. Safe, ideally behind a `TimelockController`), with a flat
  rule that no private key or seed is ever hardcoded or committed, mirroring Foundry's
  Scripting Practices guidance.
- **A deployment-script convention**: one script per concern, numbered when order
  matters (`01_Deploy.s.sol`, `02_...`), scripts read config from env vars only,
  scripts are tested by running the full suite against their resulting state, and the
  standard `forge script ... --broadcast --verify` (or `hardhat verify`) command is the
  only sanctioned path to a live network — no manual/ad hoc deploys.
- **A dependency-pinning rule**: exact-pin `@openzeppelin/contracts` (and
  `-upgradeable`) via `--save-exact`, install only from tagged releases (never a git
  `master` branch), and treat a major-version bump of any on-chain dependency as a
  storage-layout-breaking change requiring the same review as a first-time upgrade.
- **A pause/incident-response expectation**: every contract holding user value should
  have an explicit, pre-decided answer for "is this pausable, and by whom" before it
  ships, plus a runbook stub (who to contact, how to pause, how to verify a fix) —
  per Trail of Bits' incident-response guidance — rather than improvising a response
  after the fact.
- **An oracle-usage note** if the generated project is likely to touch price/data
  feeds: default to Chainlink Data Feeds over a custom/single-source oracle, and
  require staleness/deviation checks rather than trusting a raw spot read, tying back
  to the oracle-manipulation attack class.
- **A tooling baseline** naming the specific tools this repo expects an agent to reach
  for: Foundry (`forge test`, `forge coverage`, `forge script`) as the primary dev
  loop, Slither for static analysis in CI, and — only if the project's risk profile
  warrants it — Certora/formal verification as an opt-in heavier tier, not a default
  requirement.

This section stops at "what the doc should contain." Whether Starter-Pack actually adds
`docs/agents/blockchain-conventions.md`, and whether it's a standalone file or folded
into `stack-conventions.md` once a blockchain stack is chosen, is a decision for the
ADR/spec process referenced in `AGENTS.md`, not this research file.
