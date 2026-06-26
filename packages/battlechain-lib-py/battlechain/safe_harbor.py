"""Safe Harbor agreement creation, adoption, and attack-mode helpers.

Mirrors src/BCSafeHarbor.sol from cyfrin/battlechain-lib. Boa-first.
"""

from __future__ import annotations

import time

from battlechain import _boa, config
from battlechain.builders import DEFAULT_COMMITMENT_DAYS
from battlechain.errors import BattleChainError, NotBattleChainError
from battlechain.types import AgreementDetails

SECONDS_PER_DAY = 24 * 60 * 60


def create_agreement(details: AgreementDetails, owner: str, salt: bytes) -> str:
    """Create an agreement via the AgreementFactory and return its address.

    Mirrors `BCSafeHarbor.createAgreement(details, owner, salt)`.
    """
    if len(salt) != 32:
        raise ValueError(f"salt must be 32 bytes, got {len(salt)}")
    factory = _boa.agreement_factory()
    return factory.create(details.to_tuple(), owner, salt)


def set_commitment_window(agreement_address: str, duration_days: int) -> None:
    """Set the commitment window on an agreement.

    Mirrors `BCSafeHarbor.setCommitmentWindow(agreement, durationDays)`.
    Computes `block.timestamp + durationDays * 1 days` client-side using the
    local wall clock — close enough for transaction submission; the contract
    enforces the absolute deadline on-chain.
    """
    new_cant_change_until = int(time.time()) + duration_days * SECONDS_PER_DAY
    _boa.agreement(agreement_address).extendCommitmentWindow(new_cant_change_until)


def adopt_agreement(agreement_address: str) -> None:
    """Adopt an agreement in the BattleChain Safe Harbor Registry.

    Mirrors `BCSafeHarbor.adoptAgreement(agreement)`.
    """
    _boa.registry().adoptSafeHarbor(agreement_address)


def create_and_adopt_agreement(
    details: AgreementDetails,
    owner: str,
    salt: bytes,
    *,
    commitment_days: int = DEFAULT_COMMITMENT_DAYS,
) -> str:
    """Create an agreement, set a commitment window, and adopt it.

    Mirrors `BCSafeHarbor.createAndAdoptAgreement(details, owner, salt)`. The
    Solidity helper is hard-coded to `DEFAULT_COMMITMENT_DAYS = 14`; we expose
    `commitment_days` so callers can pick a different window without re-implementing.
    """
    address = create_agreement(details, owner, salt)
    set_commitment_window(address, commitment_days)
    adopt_agreement(address)
    return address


def request_attack_mode(agreement_address: str) -> None:
    """Request attack mode for an agreement. Only available on BattleChain.

    Mirrors `BCSafeHarbor.requestAttackMode(agreement)`.
    Raises NotBattleChainError if the active chain is not a BattleChain network.
    """
    chain_id = _boa.chain_id()
    if not config.is_battlechain(chain_id):
        raise NotBattleChainError(chain_id)
    _boa.attack_registry().requestUnderAttack(agreement_address)


def approve_attack_request(agreement_address: str) -> None:
    """Self-approve a pending attack request via the testnet MockRegistryModerator.

    Moves the agreement from ATTACK_REQUESTED (2) to UNDER_ATTACK (3). Mirrors JS
    `approveAttackRequest` and the `cast send <moderator> "approveAttack(address)"`
    flow from the BattleChain testnet docs. Only available on testnet, where the
    moderator is permissionless; on mainnet, approval is a real DAO governance
    action, so this raises.
    """
    chain_id = _boa.chain_id()
    moderator = config.mock_registry_moderator_address(chain_id)
    if moderator is None:
        raise BattleChainError(
            f"approve_attack_request is only available on BattleChain testnet "
            f"(chain ID {config.TESTNET_CHAIN_ID}); got chain ID {chain_id}. "
            f"On mainnet, approval is a real DAO governance action."
        )
    _boa.mock_registry_moderator(moderator).approveAttack(agreement_address)


def skip_to_production(agreement_address: str) -> None:
    """Skip an agreement directly to production. Only available on BattleChain.

    Mirrors `BCSafeHarbor.skipToProduction(agreement)`.
    """
    chain_id = _boa.chain_id()
    if not config.is_battlechain(chain_id):
        raise NotBattleChainError(chain_id)
    _boa.attack_registry().goToProduction(agreement_address)


__all__ = [
    "adopt_agreement",
    "approve_attack_request",
    "create_agreement",
    "create_and_adopt_agreement",
    "request_attack_mode",
    "set_commitment_window",
    "skip_to_production",
]
