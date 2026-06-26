"""Address registry for BattleChain contracts, resolved by chain ID.

Mirrors src/BCConfig.sol and src/BCBase.sol from cyfrin/battlechain-lib.
On supported chains, addresses resolve from the canonical registry.
On unsupported chains (Anvil, forks), use `set_overrides()` to provide them manually.
"""

from dataclasses import dataclass, field

from battlechain import createx_chains
from battlechain._contract_data import (
    BATTLECHAIN_SAFE_HARBOR_URI,
    MAINNET_AGREEMENT_FACTORY,
    MAINNET_AGREEMENT_FACTORY_IMPL,
    MAINNET_ATTACK_REGISTRY,
    MAINNET_ATTACK_REGISTRY_IMPL,
    MAINNET_CAIP2,
    MAINNET_CHAIN_ID,
    MAINNET_CREATEX,
    MAINNET_DEPLOYER,
    MAINNET_EXPLORER_HOST,
    MAINNET_REGISTRY,
    MAINNET_REGISTRY_IMPL,
    MAINNET_REGISTRY_MODERATOR,
    SAFE_HARBOR_V3_URI,
    TESTNET_AGREEMENT_FACTORY,
    TESTNET_AGREEMENT_FACTORY_IMPL,
    TESTNET_ATTACK_REGISTRY,
    TESTNET_ATTACK_REGISTRY_IMPL,
    TESTNET_CAIP2,
    TESTNET_CHAIN_ID,
    TESTNET_CREATEX,
    TESTNET_DEPLOYER,
    TESTNET_EXPLORER_HOST,
    TESTNET_MOCK_REGISTRY_MODERATOR,
    TESTNET_REGISTRY,
    TESTNET_REGISTRY_IMPL,
    WELL_KNOWN_CREATEX,
)
from battlechain.errors import (
    CreateXNotAvailableError,
    UnsupportedChainForQueryError,
    UnsupportedChainIdError,
    ZeroAddressError,
)

# Re-exported from battlechain._contract_data (generated from deployments.json):
#   chain IDs, CAIP-2 strings, CreateX/Safe-Harbor URIs, explorer hosts, and the
#   mainnet/testnet address constants. Regenerate with tools/gen_config.py.

# -----------------------------------------------------------------------------
# RPC URLs — manual overlay, not present in deployments.json
# -----------------------------------------------------------------------------

MAINNET_RPC_URL = "https://mainnet.battlechain.com"
TESTNET_RPC_URL = "https://testnet.battlechain.com"

# -----------------------------------------------------------------------------
# Block explorer
# -----------------------------------------------------------------------------

# Etherscan-compatible API: used by `verify.verify_contract` to submit source.
TESTNET_EXPLORER_API = f"{TESTNET_EXPLORER_HOST}/api"
MAINNET_EXPLORER_API = f"{MAINNET_EXPLORER_HOST}/api"


@dataclass(frozen=True)
class BcNetworkConfig:
    """Resolved network configuration for a BattleChain or CreateX-supported chain."""

    chain_id: int
    caip2: str
    registry: str
    factory: str
    attack_registry: str
    deployer: str
    create_x: str
    safe_harbor_uri: str


bc_mainnet = BcNetworkConfig(
    chain_id=MAINNET_CHAIN_ID,
    caip2=MAINNET_CAIP2,
    registry=MAINNET_REGISTRY,
    factory=MAINNET_AGREEMENT_FACTORY,
    attack_registry=MAINNET_ATTACK_REGISTRY,
    deployer=MAINNET_DEPLOYER,
    create_x=MAINNET_CREATEX,
    safe_harbor_uri=BATTLECHAIN_SAFE_HARBOR_URI,
)

bc_testnet = BcNetworkConfig(
    chain_id=TESTNET_CHAIN_ID,
    caip2=TESTNET_CAIP2,
    registry=TESTNET_REGISTRY,
    factory=TESTNET_AGREEMENT_FACTORY,
    attack_registry=TESTNET_ATTACK_REGISTRY,
    deployer=TESTNET_DEPLOYER,
    create_x=TESTNET_CREATEX,
    safe_harbor_uri=BATTLECHAIN_SAFE_HARBOR_URI,
)

_KNOWN_NETWORKS: dict[int, BcNetworkConfig] = {
    MAINNET_CHAIN_ID: bc_mainnet,
    TESTNET_CHAIN_ID: bc_testnet,
}


# -----------------------------------------------------------------------------
# Override registry for local Anvil / unsupported chains
# (mirrors `BCBase._setBcAddresses(...)`)
# -----------------------------------------------------------------------------


@dataclass
class _OverrideState:
    overrides: dict[int, BcNetworkConfig] = field(default_factory=dict)


_state = _OverrideState()


def set_overrides(
    chain_id: int,
    *,
    registry: str,
    factory: str,
    attack_registry: str,
    deployer: str,
    create_x: str | None = None,
    safe_harbor_uri: str = BATTLECHAIN_SAFE_HARBOR_URI,
    caip2: str | None = None,
) -> BcNetworkConfig:
    """Register address overrides for a chain (e.g., Anvil 31337, forks).

    Mirrors `BCBase._setBcAddresses(registry, factory, attackRegistry, deployer)`.
    Returns the resolved BcNetworkConfig.
    """
    for name, value in [
        ("registry", registry),
        ("factory", factory),
        ("attack_registry", attack_registry),
        ("deployer", deployer),
    ]:
        if not value or int(value, 16) == 0:
            raise ZeroAddressError(f"{name} cannot be the zero address")

    config = BcNetworkConfig(
        chain_id=chain_id,
        caip2=caip2 or f"eip155:{chain_id}",
        registry=registry,
        factory=factory,
        attack_registry=attack_registry,
        deployer=deployer,
        create_x=create_x or WELL_KNOWN_CREATEX,
        safe_harbor_uri=safe_harbor_uri,
    )
    _state.overrides[chain_id] = config
    return config


def clear_overrides(chain_id: int | None = None) -> None:
    """Clear overrides for one chain, or all chains if `chain_id` is None."""
    if chain_id is None:
        _state.overrides.clear()
    else:
        _state.overrides.pop(chain_id, None)


# -----------------------------------------------------------------------------
# Resolution
# -----------------------------------------------------------------------------


def get_network_config(chain_id: int) -> BcNetworkConfig:
    """Resolve the network config for a chain ID.

    Lookup order: registered overrides → known BattleChain networks.
    Raises UnsupportedChainIdError if neither has it.
    """
    if chain_id in _state.overrides:
        return _state.overrides[chain_id]
    if chain_id in _KNOWN_NETWORKS:
        return _KNOWN_NETWORKS[chain_id]
    raise UnsupportedChainIdError(chain_id)


def is_battlechain(chain_id: int) -> bool:
    """Return True if this is a BattleChain network (mainnet or testnet).

    Mirrors `BCConfig.isBattleChain()`.
    """
    return chain_id in {MAINNET_CHAIN_ID, TESTNET_CHAIN_ID}


def caip2_chain_id(chain_id: int) -> str:
    """Return the CAIP-2 chain ID string for a chain.

    Mirrors `BCConfig.caip2ChainId()` for known BattleChain networks; falls back
    to `eip155:<chainId>` for any other chain (matching `defaultAgreementDetails`).
    """
    if chain_id in _state.overrides:
        return _state.overrides[chain_id].caip2
    if chain_id == MAINNET_CHAIN_ID:
        return MAINNET_CAIP2
    if chain_id == TESTNET_CHAIN_ID:
        return TESTNET_CAIP2
    return f"eip155:{chain_id}"


def registry_address(chain_id: int) -> str:
    """Return the BattleChainSafeHarborRegistry address for a chain."""
    return get_network_config(chain_id).registry


def agreement_factory_address(chain_id: int) -> str:
    """Return the AgreementFactory address for a chain."""
    return get_network_config(chain_id).factory


def attack_registry_address(chain_id: int) -> str:
    """Return the AttackRegistry address for a chain."""
    return get_network_config(chain_id).attack_registry


def mock_registry_moderator_address(chain_id: int) -> str | None:
    """Return the permissionless MockRegistryModerator address for a chain.

    Only deployed on BattleChain testnet, where it lets an adopter self-approve
    a pending attack request (ATTACK_REQUESTED -> UNDER_ATTACK). Returns None on
    any other chain — on mainnet, approval is a real DAO governance action.
    Mirrors JS `mockRegistryModeratorAddress`.
    """
    if chain_id == TESTNET_CHAIN_ID:
        return TESTNET_MOCK_REGISTRY_MODERATOR
    return None


def deployer_address(chain_id: int) -> str:
    """Return the deployer address for a chain.

    On BattleChain networks: the BattleChainDeployer (CreateX + AttackRegistry registration).
    On other chains: CreateX at the well-known address (if supported).
    """
    if chain_id in _state.overrides:
        return _state.overrides[chain_id].deployer
    if is_battlechain(chain_id):
        return get_network_config(chain_id).deployer
    return create_x_address(chain_id)


def create_x_address(chain_id: int) -> str:
    """Return the CreateX address for a chain.

    Mirrors `BCConfig.createX()`. Raises CreateXNotAvailableError if the chain
    is not in the CreateX-supported registry.
    """
    if chain_id in _state.overrides:
        return _state.overrides[chain_id].create_x
    if chain_id == MAINNET_CHAIN_ID:
        return MAINNET_CREATEX
    if chain_id == TESTNET_CHAIN_ID:
        return TESTNET_CREATEX
    if createx_chains.is_supported(chain_id):
        return WELL_KNOWN_CREATEX
    raise CreateXNotAvailableError(chain_id)


def safe_harbor_uri(chain_id: int) -> str:
    """Return the default Safe Harbor agreement URI for a chain.

    BattleChain networks use the BattleChain-specific URI; all others use V3.
    """
    if is_battlechain(chain_id):
        return BATTLECHAIN_SAFE_HARBOR_URI
    return SAFE_HARBOR_V3_URI


def explorer_host(chain_id: int) -> str:
    """Return the bare BattleChain block explorer host for a chain.

    Used by the BCQuery off-chain agreement lookup at
    `<host>/battlechain/agreement/by-contract/<address>`.

    Mirrors `BCQuery._explorerApiUrl()` and raises `UnsupportedChainForQueryError`
    for non-BattleChain chains, matching `BCQuery__UnsupportedChainForQuery`.
    """
    if chain_id == TESTNET_CHAIN_ID:
        return TESTNET_EXPLORER_HOST
    if chain_id == MAINNET_CHAIN_ID:
        return MAINNET_EXPLORER_HOST
    raise UnsupportedChainForQueryError(chain_id)


def explorer_api(chain_id: int) -> str:
    """Return the Etherscan-compatible API URL for a chain.

    Used by `verify.verify_contract` to submit source for verification.
    """
    return f"{explorer_host(chain_id)}/api"


__all__ = [
    "BATTLECHAIN_SAFE_HARBOR_URI",
    "BcNetworkConfig",
    "MAINNET_AGREEMENT_FACTORY",
    "MAINNET_AGREEMENT_FACTORY_IMPL",
    "MAINNET_ATTACK_REGISTRY",
    "MAINNET_ATTACK_REGISTRY_IMPL",
    "MAINNET_CAIP2",
    "MAINNET_CHAIN_ID",
    "MAINNET_CREATEX",
    "MAINNET_DEPLOYER",
    "MAINNET_EXPLORER_API",
    "MAINNET_EXPLORER_HOST",
    "MAINNET_REGISTRY",
    "MAINNET_REGISTRY_IMPL",
    "MAINNET_REGISTRY_MODERATOR",
    "MAINNET_RPC_URL",
    "SAFE_HARBOR_V3_URI",
    "TESTNET_AGREEMENT_FACTORY",
    "TESTNET_AGREEMENT_FACTORY_IMPL",
    "TESTNET_ATTACK_REGISTRY",
    "TESTNET_ATTACK_REGISTRY_IMPL",
    "TESTNET_CAIP2",
    "TESTNET_CHAIN_ID",
    "TESTNET_CREATEX",
    "TESTNET_DEPLOYER",
    "TESTNET_EXPLORER_API",
    "TESTNET_EXPLORER_HOST",
    "TESTNET_MOCK_REGISTRY_MODERATOR",
    "TESTNET_REGISTRY",
    "TESTNET_REGISTRY_IMPL",
    "TESTNET_RPC_URL",
    "WELL_KNOWN_CREATEX",
    "agreement_factory_address",
    "attack_registry_address",
    "bc_mainnet",
    "bc_testnet",
    "caip2_chain_id",
    "clear_overrides",
    "create_x_address",
    "deployer_address",
    "explorer_api",
    "explorer_host",
    "get_network_config",
    "is_battlechain",
    "mock_registry_moderator_address",
    "registry_address",
    "safe_harbor_uri",
    "set_overrides",
]
