// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BCConfig } from "src/BCConfig.sol";

/// @dev External wrapper so vm.expectRevert works (library calls are inlined).
contract BCConfigCaller {
    function registry() external view returns (address) {
        return BCConfig.registry();
    }

    function agreementFactory() external view returns (address) {
        return BCConfig.agreementFactory();
    }

    function caip2ChainId() external view returns (string memory) {
        return BCConfig.caip2ChainId();
    }

    function createX() external view returns (address) {
        return BCConfig.createX();
    }
}

contract BCConfigTest is Test {
    BCConfigCaller caller;

    function setUp() public {
        caller = new BCConfigCaller();
    }

    function test_mainnet_registry() public {
        vm.chainId(626);
        assertEq(BCConfig.registry(), 0xd229f4EE1bAE432010b72a9d1bD682570F4C6eBe);
    }

    function test_mainnet_agreementFactory() public {
        vm.chainId(626);
        assertEq(BCConfig.agreementFactory(), 0xCdB7F5C0F708baBaabE82afE1DbA8362023AcFdd);
    }

    function test_mainnet_attackRegistry() public {
        vm.chainId(626);
        assertEq(BCConfig.attackRegistry(), 0x24876e481eC7198CAC95af739Df2a852CE65A415);
    }

    function test_mainnet_deployer() public {
        vm.chainId(626);
        assertEq(BCConfig.deployer(), 0xD12765D21dDba418B8Fc0583c4716763e03Aa078);
    }

    function test_testnet_registry() public {
        vm.chainId(627);
        assertEq(BCConfig.registry(), 0x07E09f67B272aec60eebBfB3D592eC649BDCFEFc);
    }

    function test_testnet_agreementFactory() public {
        vm.chainId(627);
        assertEq(BCConfig.agreementFactory(), 0xf52CEA27b9E20D03Ec48CDe4fafF8F27565646f2);
    }

    function test_testnet_attackRegistry() public {
        vm.chainId(627);
        assertEq(BCConfig.attackRegistry(), 0x22134e878c409a0Eab7259d873b38e26Ca966d3C);
    }

    function test_testnet_deployer() public {
        vm.chainId(627);
        assertEq(BCConfig.deployer(), 0x0f75289c6b883b885A1fDF9BCCABE1bbFB094077);
    }

    function test_caip2ChainId_mainnet() public {
        vm.chainId(626);
        assertEq(BCConfig.caip2ChainId(), "eip155:626");
    }

    function test_caip2ChainId_testnet() public {
        vm.chainId(627);
        assertEq(BCConfig.caip2ChainId(), "eip155:627");
    }

    function test_registry_reverts_unsupportedChain() public {
        vm.chainId(1);
        vm.expectRevert(abi.encodeWithSelector(BCConfig.BCConfig__UnsupportedChainId.selector, 1));
        caller.registry();
    }

    function test_agreementFactory_reverts_unsupportedChain() public {
        vm.chainId(999);
        vm.expectRevert(abi.encodeWithSelector(BCConfig.BCConfig__UnsupportedChainId.selector, 999));
        caller.agreementFactory();
    }

    function test_caip2ChainId_reverts_unsupportedChain() public {
        vm.chainId(42_161);
        vm.expectRevert(abi.encodeWithSelector(BCConfig.BCConfig__UnsupportedChainId.selector, 42_161));
        caller.caip2ChainId();
    }

    // -------------------------------------------------------------------------
    // isBattleChain
    // -------------------------------------------------------------------------

    function test_isBattleChain_mainnet() public {
        vm.chainId(626);
        assertTrue(BCConfig.isBattleChain());
    }

    function test_isBattleChain_testnet() public {
        vm.chainId(627);
        assertTrue(BCConfig.isBattleChain());
    }

    function test_isBattleChain_false_mainnetEth() public {
        vm.chainId(1);
        assertFalse(BCConfig.isBattleChain());
    }

    function test_isBattleChain_false_anvil() public {
        vm.chainId(31_337);
        assertFalse(BCConfig.isBattleChain());
    }

    // -------------------------------------------------------------------------
    // createX
    // -------------------------------------------------------------------------

    function test_createX_mainnet() public {
        vm.chainId(626);
        assertEq(BCConfig.createX(), 0xa397f06F07251A3AEd53f6d3019A2a6cbd83E53e);
    }

    function test_createX_testnet() public {
        vm.chainId(627);
        assertEq(BCConfig.createX(), 0xf1Ebfaa992854ECcB01Ac1F60e5b5279095cca7F);
    }

    function test_createX_wellKnown_ethereum() public {
        vm.chainId(1);
        assertEq(BCConfig.createX(), BCConfig.WELL_KNOWN_CREATEX);
    }

    function test_createX_wellKnown_base() public {
        vm.chainId(8453);
        assertEq(BCConfig.createX(), BCConfig.WELL_KNOWN_CREATEX);
    }

    function test_createX_reverts_unsupportedChain() public {
        vm.chainId(12_345_678);
        vm.expectRevert(abi.encodeWithSelector(BCConfig.BCConfig__CreateXNotAvailable.selector, 12_345_678));
        caller.createX();
    }

    // -------------------------------------------------------------------------
    // New constants
    // -------------------------------------------------------------------------

    function test_constants_uris() public pure {
        assertGt(bytes(BCConfig.SAFE_HARBOR_V3_URI).length, 0);
        assertGt(bytes(BCConfig.BATTLECHAIN_SAFE_HARBOR_URI).length, 0);
    }

    function test_constants_mainnetAddresses() public pure {
        assertTrue(BCConfig.MAINNET_REGISTRY != address(0));
        assertTrue(BCConfig.MAINNET_AGREEMENT_FACTORY != address(0));
        assertTrue(BCConfig.MAINNET_ATTACK_REGISTRY != address(0));
        assertTrue(BCConfig.MAINNET_DEPLOYER != address(0));
        assertTrue(BCConfig.MAINNET_CREATEX != address(0));
        assertTrue(BCConfig.MAINNET_REGISTRY_IMPL != address(0));
        assertTrue(BCConfig.MAINNET_AGREEMENT_FACTORY_IMPL != address(0));
        assertTrue(BCConfig.MAINNET_ATTACK_REGISTRY_IMPL != address(0));
        assertTrue(BCConfig.MAINNET_REGISTRY_MODERATOR != address(0));
    }

    function test_constants_testnetAddresses() public pure {
        assertTrue(BCConfig.TESTNET_CREATEX != address(0));
        assertTrue(BCConfig.TESTNET_REGISTRY_IMPL != address(0));
        assertTrue(BCConfig.TESTNET_AGREEMENT_FACTORY_IMPL != address(0));
        assertTrue(BCConfig.TESTNET_ATTACK_REGISTRY_IMPL != address(0));
        assertTrue(BCConfig.TESTNET_MOCK_REGISTRY_MODERATOR != address(0));
    }
}
