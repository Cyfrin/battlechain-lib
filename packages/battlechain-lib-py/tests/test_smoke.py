"""Pure-Python smoke tests — no RPC, no boa env required.

Verifies that:
  - the package imports cleanly
  - constants match the canonical Solidity values
  - dataclasses serialize to the tuple shapes the ABI expects
  - builders return well-formed agreement details
  - the explorer URL helpers route to the right hosts
  - the off-chain isAttackable logic correctly classifies the BCQuery test fixtures
"""

from __future__ import annotations

from typing import Any

import pytest

import battlechain as bc
from battlechain import config, query
from battlechain.errors import (
    ApiFailedError,
    UnsupportedChainForQueryError,
    UnsupportedChainIdError,
)

# -----------------------------------------------------------------------------
# Constants and config
# -----------------------------------------------------------------------------


def test_canonical_addresses() -> None:
    """Confirm we ship the addresses from BCConfig.sol, not the stale starter set."""
    assert config.TESTNET_REGISTRY == "0x07E09f67B272aec60eebBfB3D592eC649BDCFEFc"
    assert config.TESTNET_AGREEMENT_FACTORY == "0xf52CEA27b9E20D03Ec48CDe4fafF8F27565646f2"
    assert config.TESTNET_ATTACK_REGISTRY == "0x22134e878c409a0Eab7259d873b38e26Ca966d3C"
    assert config.TESTNET_DEPLOYER == "0x0f75289c6b883b885A1fDF9BCCABE1bbFB094077"
    # Permissionless MockRegistryModerator — anyone can call approveAttack(agreement) on testnet.
    assert config.TESTNET_MOCK_REGISTRY_MODERATOR == "0x3DdA228A38b4d7438bBF5D5137c8D1090DcaF6bF"
    assert config.WELL_KNOWN_CREATEX == "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed"


def test_mainnet_canonical_addresses() -> None:
    """Confirm we ship the mainnet addresses from BCConfig.sol."""
    cfg = config.get_network_config(626)
    assert cfg is config.bc_mainnet
    assert cfg.caip2 == "eip155:626"
    assert config.registry_address(626) == "0xd229f4EE1bAE432010b72a9d1bD682570F4C6eBe"
    assert config.agreement_factory_address(626) == "0xCdB7F5C0F708baBaabE82afE1DbA8362023AcFdd"
    assert config.attack_registry_address(626) == "0x24876e481eC7198CAC95af739Df2a852CE65A415"
    assert config.deployer_address(626) == "0xD12765D21dDba418B8Fc0583c4716763e03Aa078"
    # Mainnet CreateX is a BattleChain deployment, NOT the well-known 0xba5Ed0… address.
    assert config.create_x_address(626) == "0xa397f06F07251A3AEd53f6d3019A2a6cbd83E53e"
    assert config.create_x_address(626) != config.WELL_KNOWN_CREATEX
    assert config.MAINNET_RPC_URL == "https://mainnet.battlechain.com"


def test_safe_harbor_uris() -> None:
    assert config.BATTLECHAIN_SAFE_HARBOR_URI.startswith("ipfs://")
    assert config.SAFE_HARBOR_V3_URI.startswith("ipfs://")
    assert config.BATTLECHAIN_SAFE_HARBOR_URI != config.SAFE_HARBOR_V3_URI


def test_chain_ids() -> None:
    assert config.MAINNET_CHAIN_ID == 626
    assert config.TESTNET_CHAIN_ID == 627
    assert config.is_battlechain(626)
    assert config.is_battlechain(627)
    assert not config.is_battlechain(1)
    assert not config.is_battlechain(31337)


def test_caip2_resolution() -> None:
    assert config.caip2_chain_id(626) == "eip155:626"
    assert config.caip2_chain_id(627) == "eip155:627"
    # Unknown chains fall back to the eip155: prefix, matching defaultAgreementDetails.
    assert config.caip2_chain_id(8453) == "eip155:8453"


def test_safe_harbor_uri_resolution() -> None:
    assert config.safe_harbor_uri(627) == config.BATTLECHAIN_SAFE_HARBOR_URI
    assert config.safe_harbor_uri(1) == config.SAFE_HARBOR_V3_URI


def test_unsupported_chain_raises() -> None:
    with pytest.raises(UnsupportedChainIdError):
        config.get_network_config(1)


def test_explorer_urls() -> None:
    assert config.explorer_host(627) == "https://block-explorer-api.testnet.battlechain.com"
    assert config.explorer_host(626) == "https://block-explorer-api.mainnet.battlechain.com"
    assert config.explorer_api(627).endswith("/api")
    with pytest.raises(UnsupportedChainForQueryError):
        config.explorer_host(1)


def test_overrides_round_trip() -> None:
    config.clear_overrides()
    cfg = config.set_overrides(
        31337,
        registry="0x" + "11" * 20,
        factory="0x" + "22" * 20,
        attack_registry="0x" + "33" * 20,
        deployer="0x" + "44" * 20,
    )
    try:
        assert cfg.chain_id == 31337
        assert cfg.caip2 == "eip155:31337"
        assert config.registry_address(31337) == "0x" + "11" * 20
        assert config.deployer_address(31337) == "0x" + "44" * 20
    finally:
        config.clear_overrides(31337)


# -----------------------------------------------------------------------------
# CreateX registry
# -----------------------------------------------------------------------------


def test_createx_supported_chains() -> None:
    from battlechain import createx_chains

    assert createx_chains.is_supported(1)  # Ethereum
    assert createx_chains.is_supported(8453)  # Base
    assert createx_chains.is_supported(11155111)  # Sepolia
    assert createx_chains.is_supported(31337)  # Anvil
    assert not createx_chains.is_supported(999_999_998)


# -----------------------------------------------------------------------------
# Types and tuple serialization
# -----------------------------------------------------------------------------


def test_bounty_terms_to_tuple() -> None:
    bt = bc.default_bounty_terms()
    assert bt.to_tuple() == (10, 1_000_000, True, 0, "", 0)


def test_agreement_details_round_trip() -> None:
    contacts = (bc.Contact(name="Sec", contact="sec@x.test"),)
    # Mixed-case input — output must be lowercase to match vm.toString(address)
    # in BCSafeHarbor.buildAccounts / buildChainScope.
    contract_input = "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01"
    recovery_input = "0x1234567890ABCDEF1234567890abcdef12345678"
    chain = bc.build_chain_scope(
        contracts=[contract_input],
        recovery_address=recovery_input,
        caip2_chain_id="eip155:627",
    )
    details = bc.build_agreement_details(
        protocol_name="X",
        contacts=contacts,
        chains=(chain,),
        bounty_terms=bc.default_bounty_terms(),
        agreement_uri="ipfs://test",
    )
    serialized = details.to_tuple()
    assert serialized[0] == "X"
    assert serialized[1] == [("Sec", "sec@x.test")]

    recovery_addr_serialized = serialized[2][0][0]
    contract_addr_serialized = serialized[2][0][1][0][0]
    assert recovery_addr_serialized == recovery_input.lower()
    assert contract_addr_serialized == contract_input.lower()
    assert serialized[2][0][1][0][1] == 2  # ChildContractScope.ALL
    assert serialized[3] == (10, 1_000_000, True, 0, "", 0)
    assert serialized[4] == "ipfs://test"


def test_default_agreement_details_routes_uri_by_chain() -> None:
    contacts = (bc.Contact(name="Sec", contact="x"),)
    contracts = ["0x" + "ab" * 20]
    recovery = "0x" + "cd" * 20

    on_bc = bc.default_agreement_details("p", contacts, contracts, recovery, chain_id=627)
    off_bc = bc.default_agreement_details("p", contacts, contracts, recovery, chain_id=1)

    assert on_bc.agreement_uri == config.BATTLECHAIN_SAFE_HARBOR_URI
    assert on_bc.chains[0].caip2_chain_id == "eip155:627"
    assert off_bc.agreement_uri == config.SAFE_HARBOR_V3_URI
    assert off_bc.chains[0].caip2_chain_id == "eip155:1"


def test_agreement_state_enum() -> None:
    assert int(bc.AgreementState.UNDER_ATTACK) == 3
    assert int(bc.AgreementState.PROMOTION_REQUESTED) == 4
    assert (
        frozenset(
            {
                bc.AgreementState.UNDER_ATTACK,
                bc.AgreementState.PROMOTION_REQUESTED,
            }
        )
        == bc.ATTACKABLE_STATES
    )


# -----------------------------------------------------------------------------
# ABI shape
# -----------------------------------------------------------------------------


def test_abi_module_shape() -> None:
    from battlechain import abi as abi_module

    factory_names = {fn["name"] for fn in abi_module.AGREEMENT_FACTORY_ABI}
    assert "create" in factory_names

    deployer_names = {fn["name"] for fn in abi_module.DEPLOYER_ABI}
    assert {"deployCreate", "deployCreate2", "deployCreate3"} <= deployer_names

    registry_names = {fn["name"] for fn in abi_module.REGISTRY_ABI}
    assert "adoptSafeHarbor" in registry_names

    attack_names = {fn["name"] for fn in abi_module.ATTACK_REGISTRY_ABI}
    assert {"requestUnderAttack", "goToProduction"} <= attack_names


# -----------------------------------------------------------------------------
# is_attackable: mirrors the BCQuery test fixtures from
# /Users/patrick/code/battlechain-devex/battlechain-lib/test/mocks/mock_api.sh
# -----------------------------------------------------------------------------

_FIXTURES: dict[str, dict[str, Any]] = {
    "0x0000000000000000000000000000000000000aaa": {
        "agreements": [{"state": "UNDER_ATTACK"}],
        "hasCoverage": True,
        "isAgreementContract": False,
    },
    "0x0000000000000000000000000000000000000bbb": {
        "agreements": [{"state": "PRODUCTION"}],
        "hasCoverage": True,
        "isAgreementContract": False,
    },
    "0x0000000000000000000000000000000000000ccc": {
        "agreements": [{"state": "PROMOTION_REQUESTED"}],
        "hasCoverage": True,
        "isAgreementContract": False,
    },
    "0x0000000000000000000000000000000000000eee": {
        "agreements": [],
        "hasCoverage": False,
        "isAgreementContract": False,
    },
}


@pytest.fixture
def stub_explorer(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stub the explorer fetcher so tests don't hit the network.

    Also stubs out boa.env via _boa.chain_id to return testnet so we don't need
    a configured boa environment.
    """
    monkeypatch.setattr("battlechain.query._boa.chain_id", lambda: 627)

    def fake_fetch(contract_address: str) -> dict[str, Any]:
        contract_address = contract_address.lower()
        if contract_address in _FIXTURES:
            return _FIXTURES[contract_address]
        raise ApiFailedError(contract_address, "no fixture")

    monkeypatch.setattr(query, "_query_agreement_by_contract", fake_fetch)


@pytest.mark.parametrize(
    ("address", "expected"),
    [
        ("0x0000000000000000000000000000000000000aaa", True),  # UNDER_ATTACK
        ("0x0000000000000000000000000000000000000bbb", False),  # PRODUCTION
        ("0x0000000000000000000000000000000000000ccc", True),  # PROMOTION_REQUESTED
        ("0x0000000000000000000000000000000000000eee", False),  # no coverage
    ],
)
def test_is_attackable_matches_bcquery_fixtures(
    stub_explorer: None,
    address: str,
    expected: bool,
) -> None:
    assert bc.is_attackable(address) is expected


def test_is_attackable_propagates_api_failures(stub_explorer: None) -> None:
    with pytest.raises(ApiFailedError):
        bc.is_attackable("0x0000000000000000000000000000000000000fff")


def test_query_agreement_by_contract_url_format() -> None:
    """The URL must hit the BattleChain-specific route, not /api."""
    url = query._agreement_by_contract_url(  # noqa: SLF001
        config.TESTNET_EXPLORER_HOST, "0xabc"
    )
    assert (
        url
        == "https://block-explorer-api.testnet.battlechain.com/battlechain/agreement/by-contract/0xabc"
    )
    assert "/api" not in url
