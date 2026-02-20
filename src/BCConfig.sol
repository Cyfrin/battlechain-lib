// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Address registry for BattleChain contracts, resolved by chain ID.
/// All functions are internal view — inlined at compile time when chain ID is
/// known, or resolved at runtime on forks.
library BCConfig {
    // -------------------------------------------------------------------------
    // Chain IDs
    // -------------------------------------------------------------------------

    uint256 internal constant MAINNET_CHAIN_ID = 626;
    uint256 internal constant TESTNET_CHAIN_ID = 627;
    uint256 internal constant DEVNET_CHAIN_ID = 624;

    // -------------------------------------------------------------------------
    // CAIP-2 chain ID strings
    // -------------------------------------------------------------------------

    string internal constant MAINNET_CAIP2 = "eip155:626";
    string internal constant TESTNET_CAIP2 = "eip155:627";
    string internal constant DEVNET_CAIP2 = "eip155:624";

    // -------------------------------------------------------------------------
    // Testnet addresses
    // -------------------------------------------------------------------------

    address internal constant TESTNET_REGISTRY = 0xCb2A561395118895e2572A04C2D8AB8eCA8d7E5D;
    address internal constant TESTNET_AGREEMENT_FACTORY = 0x0EbBEeB3aBeF51801a53Fdd1fb263Ac0f2E3Ed36;
    address internal constant TESTNET_ATTACK_REGISTRY = 0x9E62988ccA776ff6613Fa68D34c9AB5431Ce57e1;
    address internal constant TESTNET_DEPLOYER = 0x8f57054CBa2021bEE15631067dd7B7E0B43F17Dc;

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error BCConfig__UnsupportedChainId(uint256 chainId);

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    function registry() internal view returns (address) {
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_REGISTRY;
        revert BCConfig__UnsupportedChainId(block.chainid);
    }

    function agreementFactory() internal view returns (address) {
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_AGREEMENT_FACTORY;
        revert BCConfig__UnsupportedChainId(block.chainid);
    }

    function attackRegistry() internal view returns (address) {
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_ATTACK_REGISTRY;
        revert BCConfig__UnsupportedChainId(block.chainid);
    }

    function deployer() internal view returns (address) {
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_DEPLOYER;
        revert BCConfig__UnsupportedChainId(block.chainid);
    }

    function caip2ChainId() internal view returns (string memory) {
        if (block.chainid == MAINNET_CHAIN_ID) return MAINNET_CAIP2;
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_CAIP2;
        if (block.chainid == DEVNET_CHAIN_ID) return DEVNET_CAIP2;
        revert BCConfig__UnsupportedChainId(block.chainid);
    }
}
