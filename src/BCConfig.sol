// SPDX-License-Identifier: MIT
// aderyn-ignore-next-line(push-zero-opcode,unspecific-solidity-pragma)
pragma solidity ^0.8.24;

import { CreateXChains } from "./CreateXChains.sol";

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
    // CreateX — well-known address, same on all supported chains
    // See CreateXChains.sol for the full list of supported chain IDs
    // -------------------------------------------------------------------------

    address internal constant WELL_KNOWN_CREATEX = 0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed;

    // -------------------------------------------------------------------------
    // URIs
    // -------------------------------------------------------------------------

    string internal constant SAFE_HARBOR_V3_URI = "ipfs://bafkreiernns2f4nv2uzvwtzjc2jboyivsu2mixz33y3xo7cvtllsuao6jy";
    string internal constant BATTLECHAIN_SAFE_HARBOR_URI =
        "ipfs://bafkreifgln3ir67woluatpwn3b65gjkrbmoq6jgzzotm3anas3vvq4yp4m";

    // -------------------------------------------------------------------------
    // Testnet addresses
    // -------------------------------------------------------------------------

    address internal constant TESTNET_REGISTRY = 0x0a652e265336a0296816aC4D8400880e3E537C24;
    address internal constant TESTNET_AGREEMENT_FACTORY = 0x2Bee2970f10FDc2aeA28662BB6F6A501278Ebd46;
    address internal constant TESTNET_ATTACK_REGISTRY = 0xdD029a6374095EEb4c47a2364Ce1D0f47f007350;
    address internal constant TESTNET_DEPLOYER = 0x74269804941119554460956f16Fe82Fbe4B90448;
    address internal constant TESTNET_CREATEX = 0xf1Ebfaa992854ECcB01Ac1F60e5b5279095cca7F;
    address internal constant TESTNET_REGISTRY_IMPL = 0xCd8B924D0F43C26E99dDE7a2C7A47d9fAf0c10bB;
    address internal constant TESTNET_AGREEMENT_FACTORY_IMPL = 0x7D14c46539f673152857Ea647E66E5AD5f820043;
    address internal constant TESTNET_ATTACK_REGISTRY_IMPL = 0x34328AeBd4e3b173B71144AB29F4509E6816277c;
    address internal constant TESTNET_MOCK_REGISTRY_MODERATOR = 0x1bC64E6F187a47D136106784f4E9182801535BD3;

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

    function isBattleChain() internal view returns (bool) {
        return
            block.chainid == MAINNET_CHAIN_ID || block.chainid == TESTNET_CHAIN_ID || block.chainid == DEVNET_CHAIN_ID;
    }

    error BCConfig__CreateXNotAvailable(uint256 chainId);

    function createX() internal view returns (address) {
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_CREATEX;
        if (CreateXChains.isSupported(block.chainid)) return WELL_KNOWN_CREATEX;
        revert BCConfig__CreateXNotAvailable(block.chainid);
    }
}
