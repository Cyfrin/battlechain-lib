"""Internal helpers for loading BattleChain protocol contracts via boa.

Centralizes the `boa.loads_abi(...).at(...)` pattern so action modules
(`deploy`, `safe_harbor`, `query`) don't repeat ABI-loading boilerplate.
"""

from __future__ import annotations

import json
from typing import Any

import boa

from battlechain import config
from battlechain.abi import (
    AGREEMENT_ABI,
    AGREEMENT_FACTORY_ABI,
    ATTACK_REGISTRY_ABI,
    DEPLOYER_ABI,
    REGISTRY_ABI,
)


def _load(abi: list[dict[str, Any]], address: str, *, name: str) -> Any:
    """Load a contract at `address` with `abi` via boa."""
    return boa.loads_abi(json.dumps(abi), name=name).at(address)


def chain_id() -> int:
    """Return the chain ID of the active boa environment.

    Polymorphic over `boa.Env` (local PyEVM) and `boa.NetworkEnv` (live RPC),
    which expose chain ID through different attributes.
    """
    env = boa.env
    if hasattr(env, "get_chain_id"):
        return env.get_chain_id()
    return env.evm.chain.chain_id


def agreement_factory(address: str | None = None) -> Any:
    """Load the AgreementFactory contract for the active chain."""
    addr = address or config.agreement_factory_address(chain_id())
    return _load(AGREEMENT_FACTORY_ABI, addr, name="AgreementFactory")


def agreement(address: str) -> Any:
    """Load an Agreement contract at the given address."""
    return _load(AGREEMENT_ABI, address, name="Agreement")


def registry(address: str | None = None) -> Any:
    """Load the BattleChainSafeHarborRegistry contract for the active chain."""
    addr = address or config.registry_address(chain_id())
    return _load(REGISTRY_ABI, addr, name="BCSafeHarborRegistry")


def attack_registry(
    address: str | None = None,
    *,
    abi: list[dict[str, Any]] | None = None,
) -> Any:
    """Load the AttackRegistry contract for the active chain.

    The optional `abi` override lets `query` swap in an extended ABI (with read
    methods like `getAgreementState`) without reloading core protocol mappings.
    """
    addr = address or config.attack_registry_address(chain_id())
    return _load(abi or ATTACK_REGISTRY_ABI, addr, name="AttackRegistry")


def deployer(address: str | None = None) -> Any:
    """Load the deployer contract for the active chain.

    On BattleChain: the BattleChainDeployer (registers with AttackRegistry).
    On other CreateX-supported chains: CreateX at the well-known address.
    """
    addr = address or config.deployer_address(chain_id())
    return _load(DEPLOYER_ABI, addr, name="BCDeployer")
