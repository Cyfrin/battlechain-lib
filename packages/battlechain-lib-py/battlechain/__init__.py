"""battlechain — Python library for deploying on BattleChain and adopting Safe Harbor agreements.

Mirrors cyfrin/battlechain-lib (Solidity). See module-level docs for details:

    battlechain.config        — chain IDs, addresses, URIs (mirrors BCConfig.sol)
    battlechain.types         — agreement dataclasses + enums (mirrors AgreementTypes.sol)
    battlechain.abi           — auto-generated ABI fragments
    battlechain.builders      — agreement builders (mirrors BCSafeHarbor builders)
    battlechain.deploy        — bc_deploy_create/2/3 + tracked deployments (mirrors BCDeploy.sol)
    battlechain.safe_harbor   — create/adopt/attack-mode helpers (mirrors BCSafeHarbor.sol)
    battlechain.query         — is_attackable + on-chain primitives (mirrors BCQuery.sol)
    battlechain.verify        — block-explorer source verification
    battlechain.errors        — exceptions mirroring Solidity custom errors
    battlechain.createx_chains — registry of CreateX-supported chains
"""

from battlechain.builders import (
    DEFAULT_BOUNTY_CAP_USD,
    DEFAULT_BOUNTY_PERCENTAGE,
    DEFAULT_COMMITMENT_DAYS,
    build_accounts,
    build_agreement_details,
    build_battlechain_scope,
    build_chain_scope,
    default_agreement_details,
    default_bounty_terms,
)
from battlechain.config import (
    BATTLECHAIN_SAFE_HARBOR_URI,
    MAINNET_AGREEMENT_FACTORY,
    MAINNET_ATTACK_REGISTRY,
    MAINNET_CAIP2,
    MAINNET_CHAIN_ID,
    MAINNET_CREATEX,
    MAINNET_DEPLOYER,
    MAINNET_EXPLORER_API,
    MAINNET_EXPLORER_HOST,
    MAINNET_REGISTRY,
    MAINNET_RPC_URL,
    SAFE_HARBOR_V3_URI,
    TESTNET_AGREEMENT_FACTORY,
    TESTNET_ATTACK_REGISTRY,
    TESTNET_CAIP2,
    TESTNET_CHAIN_ID,
    TESTNET_DEPLOYER,
    TESTNET_EXPLORER_API,
    TESTNET_EXPLORER_HOST,
    TESTNET_REGISTRY,
    TESTNET_RPC_URL,
    WELL_KNOWN_CREATEX,
    BcNetworkConfig,
    bc_mainnet,
    bc_testnet,
    is_battlechain,
)
from battlechain.deploy import (
    DEFAULT_TRACKING_FILE,
    bc_deploy,
    bc_deploy_create,
    bc_deploy_create2,
    bc_deploy_create3,
    build_init_code,
    deployed_contracts,
    get_tracked_address,
    get_tracked_contract,
    reset_deployments,
    track_deployment,
)
from battlechain.errors import (
    ApiFailedError,
    BattleChainError,
    CreateXNotAvailableError,
    NotBattleChainError,
    UnsupportedChainForQueryError,
    UnsupportedChainIdError,
    ZeroAddressError,
)
from battlechain.query import (
    get_agreement_for_contract,
    get_agreement_state,
    is_attackable,
    is_top_level_contract_under_attack,
)
from battlechain.safe_harbor import (
    adopt_agreement,
    create_agreement,
    create_and_adopt_agreement,
    request_attack_mode,
    set_commitment_window,
    skip_to_production,
)
from battlechain.types import (
    ATTACKABLE_STATES,
    AgreementDetails,
    AgreementState,
    BcAccount,
    BcChain,
    BountyTerms,
    ChildContractScope,
    Contact,
    IdentityRequirements,
)
from battlechain.verify import verify_contract

__version__ = "0.3.0"

__all__ = [
    # version
    "__version__",
    # types
    "ATTACKABLE_STATES",
    "AgreementDetails",
    "AgreementState",
    "BcAccount",
    "BcChain",
    "BcNetworkConfig",
    "BountyTerms",
    "ChildContractScope",
    "Contact",
    "IdentityRequirements",
    # config
    "BATTLECHAIN_SAFE_HARBOR_URI",
    "MAINNET_AGREEMENT_FACTORY",
    "MAINNET_ATTACK_REGISTRY",
    "MAINNET_CAIP2",
    "MAINNET_CHAIN_ID",
    "MAINNET_CREATEX",
    "MAINNET_DEPLOYER",
    "MAINNET_EXPLORER_API",
    "MAINNET_EXPLORER_HOST",
    "MAINNET_REGISTRY",
    "MAINNET_RPC_URL",
    "SAFE_HARBOR_V3_URI",
    "TESTNET_AGREEMENT_FACTORY",
    "TESTNET_ATTACK_REGISTRY",
    "TESTNET_CAIP2",
    "TESTNET_CHAIN_ID",
    "TESTNET_DEPLOYER",
    "TESTNET_EXPLORER_API",
    "TESTNET_EXPLORER_HOST",
    "TESTNET_REGISTRY",
    "TESTNET_RPC_URL",
    "WELL_KNOWN_CREATEX",
    "bc_mainnet",
    "bc_testnet",
    "is_battlechain",
    # builders
    "DEFAULT_BOUNTY_CAP_USD",
    "DEFAULT_BOUNTY_PERCENTAGE",
    "DEFAULT_COMMITMENT_DAYS",
    "build_accounts",
    "build_agreement_details",
    "build_battlechain_scope",
    "build_chain_scope",
    "default_agreement_details",
    "default_bounty_terms",
    # deploy
    "DEFAULT_TRACKING_FILE",
    "bc_deploy",
    "bc_deploy_create",
    "bc_deploy_create2",
    "bc_deploy_create3",
    "build_init_code",
    "deployed_contracts",
    "get_tracked_address",
    "get_tracked_contract",
    "reset_deployments",
    "track_deployment",
    # safe harbor
    "adopt_agreement",
    "create_agreement",
    "create_and_adopt_agreement",
    "request_attack_mode",
    "set_commitment_window",
    "skip_to_production",
    # query
    "get_agreement_for_contract",
    "get_agreement_state",
    "is_attackable",
    "is_top_level_contract_under_attack",
    # verify
    "verify_contract",
    # errors
    "ApiFailedError",
    "BattleChainError",
    "CreateXNotAvailableError",
    "NotBattleChainError",
    "UnsupportedChainForQueryError",
    "UnsupportedChainIdError",
    "ZeroAddressError",
]
