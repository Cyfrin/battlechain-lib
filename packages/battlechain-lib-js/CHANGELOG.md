# Changelog — @cyfrin/battlechain-lib-js

See the [monorepo CHANGELOG](../../CHANGELOG.md) for the full history.

## [1.1.1] - 2026-06-22

- Corrected the mainnet (626) implementation addresses (`MAINNET_REGISTRY_IMPL`,
  `MAINNET_AGREEMENT_FACTORY_IMPL`, `MAINNET_ATTACK_REGISTRY_IMPL`) to match the
  live on-chain proxy implementations (verified via the EIP-1967 slot). Runtime
  behavior is unchanged — the SDK calls the proxies.

## [1.1.0] - 2026-06-22

- Regenerated ABIs from the canonical contracts: `ATTACK_REGISTRY_ABI` gained
  `approveAttack` plus query methods, and `REGISTRY_ABI` now reflects the fuller
  `IBattleChainSafeHarborRegistry` surface. `MOCK_REGISTRY_MODERATOR_ABI` is
  retained, now generated from the contracts' `approveAttack` entrypoint.

## [1.0.0] - 2026-06-22

First published release.

- Contract addresses and ABIs are now generated from the canonical
  [`deployments.json`](../../deployments.json) and [`abis/`](../../abis) (the Solidity
  source of truth) rather than hand-maintained.
- Fixed stale testnet (627) addresses and added full mainnet (626) support
  (`getNetworkConfig(626)` previously threw).
- Corrected the Safe Harbor agreement URI and the mainnet explorer host.
- Replaced the unused eslint reference with oxlint.
