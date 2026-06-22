# Changelog

All notable changes to the BattleChain libraries are documented here.

This repository is a monorepo: the canonical Solidity library lives at the root, and
the client libraries live under `packages/` (`battlechain-lib-js`, `battlechain-lib-py`).
All addresses and ABIs are generated from a single source of truth — see
[`deployments.json`](./deployments.json) and [`abis/`](./abis).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
For the 1.0.0 milestone the three packages are released together; afterwards they
version independently (tags `v*` for `@cyfrin/battlechain-lib`, `js-v*` for
`battlechain-lib-js`, `py-v*` for `battlechain-lib-py`).

## [1.0.0] - 2026-06-22

First stable release, and the consolidation of the BattleChain libraries into one
monorepo with a single source of truth for contract addresses and ABIs.

### Repository structure

- `battlechain-lib` is now a monorepo:
  - canonical Solidity at the root (`@cyfrin/battlechain-lib` on npm),
  - `packages/battlechain-lib-js` — `battlechain-lib-js` on npm (ethers v6),
  - `packages/battlechain-lib-py` — `battlechain-lib-py` on PyPI.
- The standalone `Cyfrin/battlechain-lib-js` and `Cyfrin/battlechain-lib-py`
  repositories are archived and redirect here.

### Single source of truth

- `scripts/codegen.mjs` now generates two committed, language-neutral artifacts from
  the Solidity source (`BCConfig.sol`, `CreateXChains.sol`, `BCQuery.sol`, and the
  forge-compiled ABIs):
  - **`deployments.json`** — contract addresses, chain IDs, CAIP-2 ids, Safe Harbor
    URIs, explorer endpoints, and the CreateX chain lists for mainnet (626) and
    testnet (627).
  - **`abis/*.json`** — raw contract ABIs, including the new `IRegistryModerator`.
- Both client libraries now generate their address/ABI modules from these root
  artifacts instead of hand-maintaining them. Previously each library kept its own
  copy, which drifted from the contracts.
- A `codegen-check` CI workflow regenerates every artifact and fails on any drift
  (including untracked files), so the libraries can no longer fall out of sync.

### Fixed

- `battlechain-lib-js` shipped stale testnet (627) addresses and had **no** mainnet
  (626) configuration — `getNetworkConfig(626)` threw. All addresses now match the
  canonical Solidity, and mainnet is fully supported.
- Corrected the `battlechain-lib-js` Safe Harbor agreement URI and mainnet explorer host.
- `battlechain-lib-js` linting referenced eslint, which was never installed; replaced
  with oxlint.
- `battlechain-lib-py` `config.py` / `createx_chains.py` were hand-maintained; they are
  now generated, removing the same drift risk.

### Added

- `IRegistryModerator` Solidity interface (the `approveAttack` entrypoint), so the
  moderator ABI is generated rather than hand-written downstream.
- Mainnet (626) support across all three libraries.
- Per-package publish workflows: `js-v*` → npm (with provenance), `py-v*` → PyPI
  (OIDC trusted publishing), `v*` → `@cyfrin/battlechain-lib`.
- `@cyfrin/battlechain-lib` now ships `deployments.json` and `abis/` in the published
  package.

### Notes

- This is the first published release of `battlechain-lib-js`.
- `@cyfrin/battlechain-lib` jumps from 0.1.x to 1.0.0 as part of the coordinated milestone.

[1.0.0]: https://github.com/Cyfrin/battlechain-lib/releases/tag/v1.0.0
