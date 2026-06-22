"""Off-chain queries against the BattleChain block explorer API.

Mirrors src/BCQuery.sol from cyfrin/battlechain-lib. The Solidity helper uses
`vm.ffi` + `curl` because Solidity can't make HTTP calls natively; in Python
we issue the same HTTP request directly, no FFI shim needed.

The `is_attackable` predicate hits the explorer's
`/battlechain/agreement/by-contract/<address>` route and returns True if any
covering agreement is in `UNDER_ATTACK` or `PROMOTION_REQUESTED` — the two
states during which whitehats may legally engage under Safe Harbor.

This works for both top-level and child contracts (the explorer resolves
coverage server-side). For top-level contracts, you can also use the on-chain
primitives at the bottom of this module.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from battlechain import _boa, config
from battlechain.abi import ATTACK_REGISTRY_ABI
from battlechain.errors import ApiFailedError
from battlechain.types import ATTACKABLE_STATES, AgreementState

# Explorer API returns state as a string, not the on-chain numeric enum.
# These mirror the literals BCQuery.sol matches against.
_UNDER_ATTACK = "UNDER_ATTACK"
_PROMOTION_REQUESTED = "PROMOTION_REQUESTED"
_ATTACKABLE_STATE_NAMES: frozenset[str] = frozenset({_UNDER_ATTACK, _PROMOTION_REQUESTED})

_REQUEST_TIMEOUT_SECONDS = 10


def _agreement_by_contract_url(host: str, contract_address: str) -> str:
    return f"{host}/battlechain/agreement/by-contract/{contract_address}"


def _query_agreement_by_contract(contract_address: str) -> dict[str, Any]:
    """Fetch the explorer's agreement-by-contract response as a parsed dict.

    Mirrors `BCQuery._queryAgreementByContract(address)`. Raises ApiFailedError
    on transport, HTTP, or JSON failures (mirroring `BCQuery__ApiFailed`).
    """
    chain_id = _boa.chain_id()
    url = _agreement_by_contract_url(config.explorer_host(chain_id), contract_address)
    try:
        with urllib.request.urlopen(url, timeout=_REQUEST_TIMEOUT_SECONDS) as resp:
            payload = resp.read()
    except (urllib.error.URLError, TimeoutError) as exc:
        raise ApiFailedError(contract_address, str(exc)) from exc

    if not payload:
        raise ApiFailedError(contract_address, "empty response")

    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        raise ApiFailedError(contract_address, f"invalid JSON: {exc}") from exc


def is_attackable(contract_address: str) -> bool:
    """Return True if a contract is currently fair game for whitehats.

    Mirrors `BCQuery.isAttackable(address)`. A contract is attackable when any
    covering Safe Harbor agreement is in `UNDER_ATTACK` or `PROMOTION_REQUESTED`.

    Resolves coverage via the BattleChain block explorer API, which works for
    both top-level and child contracts. Raises `ApiFailedError` if the API call
    fails, and `UnsupportedChainForQueryError` if the active chain isn't
    BattleChain testnet/mainnet.
    """
    response = _query_agreement_by_contract(contract_address)

    if not response.get("hasCoverage", False):
        return False

    for agreement_entry in response.get("agreements", []):
        state = agreement_entry.get("state")
        if isinstance(state, str) and state in _ATTACKABLE_STATE_NAMES:
            return True

    return False


# -----------------------------------------------------------------------------
# On-chain primitives (top-level contracts only)
# -----------------------------------------------------------------------------
#
# These mirror the AttackRegistry view methods documented at
# https://docs.battlechain.com/battlechain/reference/contracts. The lib's
# IAttackRegistry interface omits them because BCSafeHarbor only needs the
# write methods — we declare them here for direct on-chain access.
#
# These work only for *top-level* contracts (those deployed via
# BattleChainDeployer). For child contracts, prefer `is_attackable` above.

_ATTACK_REGISTRY_QUERY_METHODS: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "getAgreementState",
        "stateMutability": "view",
        "inputs": [{"name": "agreementAddress", "type": "address"}],
        "outputs": [{"name": "", "type": "uint8"}],
    },
    {
        "type": "function",
        "name": "getAgreementForContract",
        "stateMutability": "view",
        "inputs": [{"name": "contractAddress", "type": "address"}],
        "outputs": [{"name": "", "type": "address"}],
    },
    {
        "type": "function",
        "name": "isTopLevelContractUnderAttack",
        "stateMutability": "view",
        "inputs": [{"name": "contractAddress", "type": "address"}],
        "outputs": [{"name": "", "type": "bool"}],
    },
]

ATTACK_REGISTRY_QUERY_ABI: list[dict[str, Any]] = (
    ATTACK_REGISTRY_ABI + _ATTACK_REGISTRY_QUERY_METHODS
)


def _query_registry() -> Any:
    return _boa.attack_registry(abi=ATTACK_REGISTRY_QUERY_ABI)


def get_agreement_state(agreement_address: str) -> AgreementState:
    """Return the current state of a Safe Harbor agreement (on-chain)."""
    raw = _query_registry().getAgreementState(agreement_address)
    return AgreementState(int(raw))


def get_agreement_for_contract(contract_address: str) -> str | None:
    """Return the Binding Agreement address for a top-level contract, or None.

    Returns None for non-registered or child contracts.
    """
    address = _query_registry().getAgreementForContract(contract_address)
    if int(address, 16) == 0:
        return None
    return address


def is_top_level_contract_under_attack(contract_address: str) -> bool:
    """On-chain check: True if a top-level contract's agreement is UNDER_ATTACK.

    Narrower than `is_attackable` — does NOT include `PROMOTION_REQUESTED`, and
    only works for top-level contracts. Useful when you want a pure on-chain
    answer without an HTTP round-trip.
    """
    return bool(_query_registry().isTopLevelContractUnderAttack(contract_address))


__all__ = [
    "ATTACK_REGISTRY_QUERY_ABI",
    "ATTACKABLE_STATES",
    "AgreementState",
    "get_agreement_for_contract",
    "get_agreement_state",
    "is_attackable",
    "is_top_level_contract_under_attack",
]
