# Changelog — @cyfrin/battlechain-lib-js

See the [monorepo CHANGELOG](../../CHANGELOG.md) for the full history.

## [1.0.0] - 2026-06-22

First published release.

- Contract addresses and ABIs are now generated from the canonical
  [`deployments.json`](../../deployments.json) and [`abis/`](../../abis) (the Solidity
  source of truth) rather than hand-maintained.
- Fixed stale testnet (627) addresses and added full mainnet (626) support
  (`getNetworkConfig(626)` previously threw).
- Corrected the Safe Harbor agreement URI and the mainnet explorer host.
- Replaced the unused eslint reference with oxlint.
