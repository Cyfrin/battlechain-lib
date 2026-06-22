# Changelog — battlechain-lib-py

See the [monorepo CHANGELOG](../../CHANGELOG.md) for the full history.

## [1.1.1] - 2026-06-22

- Corrected the mainnet (626) implementation addresses in `_contract_data.py`
  (`MAINNET_*_IMPL`) to match the live on-chain proxy implementations (verified
  via the EIP-1967 slot). Runtime behavior is unchanged.

## [1.1.0] - 2026-06-22

- `abi.py` regenerated from the canonical [`abis/`](../../abis) artifacts, which
  were rebuilt from the real contracts. The `attackRegistry` and `registry` ABIs
  are now richer (full function/event coverage). The public API is unchanged.

## [1.0.0] - 2026-06-22

- `config.py` and `createx_chains.py` are now generated from the canonical
  [`deployments.json`](../../deployments.json); `abi.py` is generated from
  [`abis/`](../../abis). Previously the addresses and chain lists were hand-maintained.
  The public API is unchanged.
- Mainnet (626) support stays in sync with the canonical Solidity automatically.
