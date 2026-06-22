# Changelog — battlechain-lib-py

See the [monorepo CHANGELOG](../../CHANGELOG.md) for the full history.

## [1.0.0] - 2026-06-22

- `config.py` and `createx_chains.py` are now generated from the canonical
  [`deployments.json`](../../deployments.json); `abi.py` is generated from
  [`abis/`](../../abis). Previously the addresses and chain lists were hand-maintained.
  The public API is unchanged.
- Mainnet (626) support stays in sync with the canonical Solidity automatically.
