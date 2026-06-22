"""Tests for the deploy module's high-level API.

Covers:
  - `build_init_code` for contracts with and without constructor args
  - constructor type extraction from boa Vyper deployers
  - the JSON tracking file (per-chain sections, round-trip via
    `get_tracked_address` / `get_tracked_contract`)

`bc_deploy` itself isn't unit-tested end-to-end here because it requires a
live RPC and the BCDeployer contract — those paths are exercised by integration
tests in the starter repo.
"""

from __future__ import annotations

from pathlib import Path

import boa
import pytest
from eth_abi import encode

from battlechain import deploy

NO_CTOR_SOURCE = """
# pragma version ^0.4.0

x: public(uint256)

@external
def set_x(n: uint256):
    self.x = n
"""

WITH_CTOR_SOURCE = """
# pragma version ^0.4.0

token: public(address)
amount: public(uint256)

@deploy
def __init__(token_: address, amount_: uint256):
    self.token = token_
    self.amount = amount_
"""


@pytest.fixture
def no_ctor_deployer():
    return boa.loads_partial(NO_CTOR_SOURCE)


@pytest.fixture
def with_ctor_deployer():
    return boa.loads_partial(WITH_CTOR_SOURCE)


def test_build_init_code_no_ctor(no_ctor_deployer) -> None:
    init_code = deploy.build_init_code(no_ctor_deployer)
    assert init_code == no_ctor_deployer.compiler_data.bytecode


def test_build_init_code_no_ctor_rejects_args(no_ctor_deployer) -> None:
    with pytest.raises(ValueError, match="no constructor"):
        deploy.build_init_code(no_ctor_deployer, 42)


def test_build_init_code_with_ctor_appends_encoded_args(with_ctor_deployer) -> None:
    token = "0x" + "ab" * 20
    amount = 1234
    init_code = deploy.build_init_code(with_ctor_deployer, token, amount)

    bytecode = with_ctor_deployer.compiler_data.bytecode
    expected_args = encode(["address", "uint256"], [token, amount])
    assert init_code == bytecode + expected_args


def test_build_init_code_arg_count_mismatch(with_ctor_deployer) -> None:
    with pytest.raises(ValueError, match="expects 2 args"):
        deploy.build_init_code(with_ctor_deployer, "0x" + "00" * 20)


def test_ctor_arg_types_no_ctor(no_ctor_deployer) -> None:
    assert deploy._ctor_arg_types(no_ctor_deployer) is None  # noqa: SLF001


def test_ctor_arg_types_with_ctor(with_ctor_deployer) -> None:
    assert deploy._ctor_arg_types(with_ctor_deployer) == ["address", "uint256"]  # noqa: SLF001


def test_canonical_type_primitive() -> None:
    assert deploy._canonical_type({"type": "address"}) == "address"  # noqa: SLF001
    assert deploy._canonical_type({"type": "uint256"}) == "uint256"  # noqa: SLF001
    assert deploy._canonical_type({"type": "bytes32"}) == "bytes32"  # noqa: SLF001


def test_canonical_type_tuple_with_components() -> None:
    """Nested struct ABI inputs must be flattened to canonical (a,b)c[] form."""
    nested = {
        "type": "tuple[]",
        "components": [
            {"name": "addr", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
    }
    assert deploy._canonical_type(nested) == "(address,uint256)[]"  # noqa: SLF001


def test_deployer_name_from_compiler_data(with_ctor_deployer) -> None:
    # `loads_partial` synthesizes a contract_path so we get a stable name.
    name = deploy._deployer_name(with_ctor_deployer)  # noqa: SLF001
    assert isinstance(name, str)
    assert len(name) > 0


def test_tracking_round_trip(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(deploy._boa, "chain_id", lambda: 627)  # noqa: SLF001
    file = tmp_path / "deployments.json"

    assert deploy.get_tracked_address("MyContract", tracking_path=file) is None

    deploy._track_address("MyContract", "0xdead", file)  # noqa: SLF001
    assert deploy.get_tracked_address("MyContract", tracking_path=file) == "0xdead"


def test_tracking_isolates_per_chain(tmp_path: Path, monkeypatch) -> None:
    file = tmp_path / "deployments.json"

    monkeypatch.setattr(deploy._boa, "chain_id", lambda: 627)  # noqa: SLF001
    deploy._track_address("Vault", "0xtestnet", file)  # noqa: SLF001

    monkeypatch.setattr(deploy._boa, "chain_id", lambda: 626)  # noqa: SLF001
    assert deploy.get_tracked_address("Vault", tracking_path=file) is None

    deploy._track_address("Vault", "0xmainnet", file)  # noqa: SLF001
    assert deploy.get_tracked_address("Vault", tracking_path=file) == "0xmainnet"

    monkeypatch.setattr(deploy._boa, "chain_id", lambda: 627)  # noqa: SLF001
    assert deploy.get_tracked_address("Vault", tracking_path=file) == "0xtestnet"


def test_tracking_file_format_is_per_chain(tmp_path: Path, monkeypatch) -> None:
    """The on-disk shape is {chain_id: {name: address}} — stable for tooling."""
    file = tmp_path / "deployments.json"
    monkeypatch.setattr(deploy._boa, "chain_id", lambda: 627)  # noqa: SLF001
    deploy._track_address("A", "0x1", file)  # noqa: SLF001
    deploy._track_address("B", "0x2", file)  # noqa: SLF001

    import json
    data = json.loads(file.read_text())
    assert data == {"627": {"A": "0x1", "B": "0x2"}}
