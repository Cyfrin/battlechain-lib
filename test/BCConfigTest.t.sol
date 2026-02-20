// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BCConfig } from "bc-lib/BCConfig.sol";

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
}

contract BCConfigTest is Test {
    BCConfigCaller caller;

    function setUp() public {
        caller = new BCConfigCaller();
    }

    function test_testnet_registry() public {
        vm.chainId(627);
        assertEq(BCConfig.registry(), 0xCb2A561395118895e2572A04C2D8AB8eCA8d7E5D);
    }

    function test_testnet_agreementFactory() public {
        vm.chainId(627);
        assertEq(BCConfig.agreementFactory(), 0x0EbBEeB3aBeF51801a53Fdd1fb263Ac0f2E3Ed36);
    }

    function test_testnet_attackRegistry() public {
        vm.chainId(627);
        assertEq(BCConfig.attackRegistry(), 0x9E62988ccA776ff6613Fa68D34c9AB5431Ce57e1);
    }

    function test_testnet_deployer() public {
        vm.chainId(627);
        assertEq(BCConfig.deployer(), 0x8f57054CBa2021bEE15631067dd7B7E0B43F17Dc);
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
}
