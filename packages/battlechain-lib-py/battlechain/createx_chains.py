"""Registry of chains where CreateX is deployed at the well-known address.

Mirrors src/CreateXChains.sol from cyfrin/battlechain-lib.
Source: https://github.com/pcaversaccio/createx#createx-deployments
Well-known address: 0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed (same on all chains).

The chain ID sets are generated from deployments.json — see
battlechain/_contract_data.py (regenerate with tools/gen_config.py).
"""

from battlechain._contract_data import PRODUCTION_CHAIN_IDS, TEST_CHAIN_IDS

__all__ = ["PRODUCTION_CHAIN_IDS", "TEST_CHAIN_IDS", "is_supported"]


def is_supported(chain_id: int) -> bool:
    """Return True if CreateX is deployed at the well-known address on this chain."""
    return chain_id in PRODUCTION_CHAIN_IDS or chain_id in TEST_CHAIN_IDS
