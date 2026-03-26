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

    function test_testnet_registry() public {
        vm.chainId(627);
        assertEq(BCConfig.registry(), 0x0A652e265336a0296816ac4D8400880E3e537c24);
    }

    function test_testnet_agreementFactory() public {
        vm.chainId(627);
        assertEq(BCConfig.agreementFactory(), 0x2BEe2970f10FDc2aeA28662Bb6f6a501278eBd46);
    }

    function test_testnet_attackRegistry() public {
        vm.chainId(627);
        assertEq(BCConfig.attackRegistry(), 0xdD029a6374095EEb4c47a2364Ce1D0f47f007350);
    }

    function test_testnet_deployer() public {
        vm.chainId(627);
        assertEq(BCConfig.deployer(), 0x74269804941119554460956f16Fe82Fbe4B90448);
    }

    function test_caip2ChainId_mainnet() public {
        vm.chainId(626);
        assertEq(BCConfig.caip2ChainId(), "eip155:626");
    }

    function test_caip2ChainId_testnet() public {
        vm.chainId(627);
        assertEq(BCConfig.caip2ChainId(), "eip155:627");
    }

    function test_caip2ChainId_devnet() public {
        vm.chainId(624);
        assertEq(BCConfig.caip2ChainId(), "eip155:624");
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

    function test_isBattleChain_devnet() public {
        vm.chainId(624);
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

    function test_constants_testnetAddresses() public pure {
        assertTrue(BCConfig.TESTNET_CREATEX != address(0));
        assertTrue(BCConfig.TESTNET_REGISTRY_IMPL != address(0));
        assertTrue(BCConfig.TESTNET_AGREEMENT_FACTORY_IMPL != address(0));
        assertTrue(BCConfig.TESTNET_ATTACK_REGISTRY_IMPL != address(0));
        assertTrue(BCConfig.TESTNET_MOCK_REGISTRY_MODERATOR != address(0));
    }
}
