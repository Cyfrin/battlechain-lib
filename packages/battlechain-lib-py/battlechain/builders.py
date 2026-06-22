"""Agreement builder helpers.

Mirrors the builder functions in src/BCSafeHarbor.sol (and ts/builders.ts) from
cyfrin/battlechain-lib. All builders are pure: they take inputs and return
frozen dataclass instances. No on-chain calls.
"""

from collections.abc import Iterable, Sequence

from eth_utils import to_canonical_address

from battlechain import config
from battlechain.types import (
    AgreementDetails,
    BcAccount,
    BcChain,
    BountyTerms,
    ChildContractScope,
    Contact,
    IdentityRequirements,
)


def _to_lowercase_hex(address: str) -> str:
    """Normalize an address to lowercase 0x-prefixed hex.

    Matches `vm.toString(address)` from forge-std, which is what BCSafeHarbor
    uses when storing addresses in `Account.accountAddress` and
    `BcChain.assetRecoveryAddress`. Using checksum case here would produce
    different bytes than agreements built via the Solidity lib.
    """
    return "0x" + to_canonical_address(address).hex()

# Defaults pulled from BCSafeHarbor.sol:
#   DEFAULT_BOUNTY_PERCENTAGE = 10
#   DEFAULT_BOUNTY_CAP_USD    = 1_000_000
#   DEFAULT_COMMITMENT_DAYS   = 14
DEFAULT_BOUNTY_PERCENTAGE = 10
DEFAULT_BOUNTY_CAP_USD = 1_000_000
DEFAULT_COMMITMENT_DAYS = 14


def default_bounty_terms() -> BountyTerms:
    """Return default bounty terms: 10%, $1M cap, retainable, anonymous, no aggregate cap.

    Mirrors `BCSafeHarbor.defaultBountyTerms()`.
    """
    return BountyTerms(
        bounty_percentage=DEFAULT_BOUNTY_PERCENTAGE,
        bounty_cap_usd=DEFAULT_BOUNTY_CAP_USD,
        retainable=True,
        identity=IdentityRequirements.ANONYMOUS,
        diligence_requirements="",
        aggregate_bounty_cap_usd=0,
    )


def build_accounts(
    addresses: Iterable[str],
    *,
    scope: ChildContractScope = ChildContractScope.ALL,
) -> tuple[BcAccount, ...]:
    """Convert a list of addresses to BcAccount tuples.

    Mirrors `BCSafeHarbor.buildAccounts()`. Defaults to `ChildContractScope.ALL`,
    matching the Solidity helper.
    """
    return tuple(
        BcAccount(account_address=_to_lowercase_hex(addr), child_contract_scope=scope)
        for addr in addresses
    )


def build_chain_scope(
    contracts: Sequence[str],
    recovery_address: str,
    caip2_chain_id: str,
    *,
    scope: ChildContractScope = ChildContractScope.ALL,
) -> BcChain:
    """Build a BcChain entry for any EVM chain.

    Mirrors `BCSafeHarbor.buildChainScope()`.
    """
    return BcChain(
        asset_recovery_address=_to_lowercase_hex(recovery_address),
        accounts=build_accounts(contracts, scope=scope),
        caip2_chain_id=caip2_chain_id,
    )


def build_battlechain_scope(
    contracts: Sequence[str],
    recovery_address: str,
    chain_id: int,
    *,
    scope: ChildContractScope = ChildContractScope.ALL,
) -> BcChain:
    """Build a BcChain entry for the current BattleChain network.

    Mirrors `BCSafeHarbor.buildBattleChainScope()`. Resolves the CAIP-2 chain ID
    via `config.caip2_chain_id`.
    """
    return build_chain_scope(
        contracts=contracts,
        recovery_address=recovery_address,
        caip2_chain_id=config.caip2_chain_id(chain_id),
        scope=scope,
    )


def build_agreement_details(
    protocol_name: str,
    contacts: Sequence[Contact],
    chains: Sequence[BcChain],
    bounty_terms: BountyTerms,
    agreement_uri: str,
) -> AgreementDetails:
    """Build a full AgreementDetails struct with explicit parameters.

    Mirrors `BCSafeHarbor.buildAgreementDetails()`.
    """
    return AgreementDetails(
        protocol_name=protocol_name,
        contact_details=tuple(contacts),
        chains=tuple(chains),
        bounty_terms=bounty_terms,
        agreement_uri=agreement_uri,
    )


def default_agreement_details(
    protocol_name: str,
    contacts: Sequence[Contact],
    contracts: Sequence[str],
    recovery_address: str,
    chain_id: int,
    *,
    scope: ChildContractScope = ChildContractScope.ALL,
    bounty_terms: BountyTerms | None = None,
) -> AgreementDetails:
    """Build a full AgreementDetails with sensible defaults.

    Mirrors `BCSafeHarbor.defaultAgreementDetails()`. On BattleChain networks, uses
    the BattleChain CAIP-2 scope and BattleChain Safe Harbor URI; on other chains,
    uses the chain's CAIP-2 string and the generic Safe Harbor V3 URI.
    """
    chain = build_chain_scope(
        contracts=contracts,
        recovery_address=recovery_address,
        caip2_chain_id=config.caip2_chain_id(chain_id),
        scope=scope,
    )
    return AgreementDetails(
        protocol_name=protocol_name,
        contact_details=tuple(contacts),
        chains=(chain,),
        bounty_terms=bounty_terms or default_bounty_terms(),
        agreement_uri=config.safe_harbor_uri(chain_id),
    )


__all__ = [
    "DEFAULT_BOUNTY_CAP_USD",
    "DEFAULT_BOUNTY_PERCENTAGE",
    "DEFAULT_COMMITMENT_DAYS",
    "build_accounts",
    "build_agreement_details",
    "build_battlechain_scope",
    "build_chain_scope",
    "default_agreement_details",
    "default_bounty_terms",
]
