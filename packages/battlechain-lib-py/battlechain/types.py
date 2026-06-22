"""Agreement and registry data types.

Mirrors src/types/AgreementTypes.sol from cyfrin/battlechain-lib, plus the
`AgreementState` enum from the BattleChain protocol docs.

Each dataclass exposes a `to_tuple()` method that serializes to the positional
form expected by boa's `loads_abi(...).at(addr).method(...)` calls.
"""

from dataclasses import dataclass, field
from enum import IntEnum


class ChildContractScope(IntEnum):
    """How children of an account in scope are treated.

    Mirrors `enum ChildContractScope` from AgreementTypes.sol.
    """

    NONE = 0
    EXISTING_ONLY = 1
    ALL = 2
    FUTURE_ONLY = 3


class IdentityRequirements(IntEnum):
    """Identity verification level required of whitehats.

    Mirrors `enum IdentityRequirements` from AgreementTypes.sol.
    """

    ANONYMOUS = 0
    PSEUDONYMOUS = 1
    NAMED = 2


class AgreementState(IntEnum):
    """Lifecycle state of a Safe Harbor agreement on the AttackRegistry.

    Mirrors `IAttackRegistry.ContractState` from the BattleChain docs:
    https://docs.battlechain.com/llms-full.txt
    """

    NOT_DEPLOYED = 0
    NEW_DEPLOYMENT = 1
    ATTACK_REQUESTED = 2
    UNDER_ATTACK = 3
    PROMOTION_REQUESTED = 4
    PRODUCTION = 5
    CORRUPTED = 6


# States during which a covering contract is fair game for whitehats.
# Mirrors the docs' `isAttackable` semantics.
ATTACKABLE_STATES: frozenset[AgreementState] = frozenset({
    AgreementState.UNDER_ATTACK,
    AgreementState.PROMOTION_REQUESTED,
})


@dataclass(frozen=True)
class Contact:
    """Security pre-notification contact.

    Mirrors `struct Contact` from AgreementTypes.sol.
    """

    name: str
    contact: str

    def to_tuple(self) -> tuple[str, str]:
        return (self.name, self.contact)


@dataclass(frozen=True)
class BcAccount:
    """An account (contract) covered by a Safe Harbor agreement.

    Mirrors `struct BcAccount` from AgreementTypes.sol.
    """

    account_address: str
    child_contract_scope: ChildContractScope = ChildContractScope.ALL

    def to_tuple(self) -> tuple[str, int]:
        return (self.account_address, int(self.child_contract_scope))


@dataclass(frozen=True)
class BcChain:
    """A chain entry in an agreement's scope.

    Mirrors `struct BcChain` from AgreementTypes.sol.
    """

    asset_recovery_address: str
    accounts: tuple[BcAccount, ...]
    caip2_chain_id: str

    def to_tuple(self) -> tuple[str, list[tuple[str, int]], str]:
        return (
            self.asset_recovery_address,
            [a.to_tuple() for a in self.accounts],
            self.caip2_chain_id,
        )


@dataclass(frozen=True)
class BountyTerms:
    """Bounty terms offered by a protocol under Safe Harbor.

    Mirrors `struct BountyTerms` from AgreementTypes.sol.
    """

    bounty_percentage: int
    bounty_cap_usd: int
    retainable: bool
    identity: IdentityRequirements = IdentityRequirements.ANONYMOUS
    diligence_requirements: str = ""
    aggregate_bounty_cap_usd: int = 0

    def to_tuple(self) -> tuple[int, int, bool, int, str, int]:
        return (
            self.bounty_percentage,
            self.bounty_cap_usd,
            self.retainable,
            int(self.identity),
            self.diligence_requirements,
            self.aggregate_bounty_cap_usd,
        )


@dataclass(frozen=True)
class AgreementDetails:
    """Full Safe Harbor agreement details.

    Mirrors `struct AgreementDetails` from AgreementTypes.sol.
    """

    protocol_name: str
    contact_details: tuple[Contact, ...]
    chains: tuple[BcChain, ...]
    bounty_terms: BountyTerms
    agreement_uri: str

    def to_tuple(
        self,
    ) -> tuple[
        str,
        list[tuple[str, str]],
        list[tuple[str, list[tuple[str, int]], str]],
        tuple[int, int, bool, int, str, int],
        str,
    ]:
        return (
            self.protocol_name,
            [c.to_tuple() for c in self.contact_details],
            [c.to_tuple() for c in self.chains],
            self.bounty_terms.to_tuple(),
            self.agreement_uri,
        )


__all__ = [
    "ATTACKABLE_STATES",
    "AgreementDetails",
    "AgreementState",
    "BcAccount",
    "BcChain",
    "BountyTerms",
    "ChildContractScope",
    "Contact",
    "IdentityRequirements",
    "field",
]
