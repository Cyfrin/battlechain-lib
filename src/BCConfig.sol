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

    // -------------------------------------------------------------------------
    // CAIP-2 chain ID strings
    // -------------------------------------------------------------------------

    string internal constant MAINNET_CAIP2 = "eip155:626";
    string internal constant TESTNET_CAIP2 = "eip155:627";

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
        "ipfs://bafkreibrplcrle2zxiezhm2metajrrdqyvwglhakddrdt27elmrezp5bge";

    // -------------------------------------------------------------------------
    // Mainnet addresses
    // -------------------------------------------------------------------------

    address internal constant MAINNET_REGISTRY = 0xd229f4EE1bAE432010b72a9d1bD682570F4C6eBe;
    address internal constant MAINNET_AGREEMENT_FACTORY = 0xCdB7F5C0F708baBaabE82afE1DbA8362023AcFdd;
    address internal constant MAINNET_ATTACK_REGISTRY = 0x24876e481eC7198CAC95af739Df2a852CE65A415;
    address internal constant MAINNET_DEPLOYER = 0xD12765D21dDba418B8Fc0583c4716763e03Aa078;
    address internal constant MAINNET_CREATEX = 0xa397f06F07251A3AEd53f6d3019A2a6cbd83E53e;
    address internal constant MAINNET_REGISTRY_IMPL = 0x96d9cCEf1C2eBD19Cc4D3293Bd726c335F9523d7;
    address internal constant MAINNET_AGREEMENT_FACTORY_IMPL = 0xF52b4B00E6c33ED327886fc64c205a9F2DEc3623;
    address internal constant MAINNET_ATTACK_REGISTRY_IMPL = 0x2d226C9f76748C3759F640Ee527Ad0D1A312fbB2;
    address internal constant MAINNET_REGISTRY_MODERATOR = 0x445d5685c4Ae71550Da0716b82B434AEA140E0c7;

    // -------------------------------------------------------------------------
    // Testnet addresses
    // -------------------------------------------------------------------------

    address internal constant TESTNET_REGISTRY = 0x07E09f67B272aec60eebBfB3D592eC649BDCFEFc;
    address internal constant TESTNET_AGREEMENT_FACTORY = 0xf52CEA27b9E20D03Ec48CDe4fafF8F27565646f2;
    address internal constant TESTNET_ATTACK_REGISTRY = 0x22134e878c409a0Eab7259d873b38e26Ca966d3C;
    address internal constant TESTNET_DEPLOYER = 0x0f75289c6b883b885A1fDF9BCCABE1bbFB094077;
    address internal constant TESTNET_CREATEX = 0xf1Ebfaa992854ECcB01Ac1F60e5b5279095cca7F;
    address internal constant TESTNET_REGISTRY_IMPL = 0x7d6fC65eA6436f1621973BcfeaAD8951853D8E35;
    address internal constant TESTNET_AGREEMENT_FACTORY_IMPL = 0x8E940c4FE62ea1696751faA99F45F30459c6c978;
    address internal constant TESTNET_ATTACK_REGISTRY_IMPL = 0x4496b7e04b4Dd94153AA0d614708d5f06fc65a13;
    address internal constant TESTNET_MOCK_REGISTRY_MODERATOR = 0x3DdA228A38b4d7438bBF5D5137c8D1090DcaF6bF;

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error BCConfig__UnsupportedChainId(uint256 chainId);

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    function registry() internal view returns (address) {
        if (block.chainid == MAINNET_CHAIN_ID) return MAINNET_REGISTRY;
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_REGISTRY;
        revert BCConfig__UnsupportedChainId(block.chainid);
    }

    function agreementFactory() internal view returns (address) {
        if (block.chainid == MAINNET_CHAIN_ID) return MAINNET_AGREEMENT_FACTORY;
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_AGREEMENT_FACTORY;
        revert BCConfig__UnsupportedChainId(block.chainid);
    }

    function attackRegistry() internal view returns (address) {
        if (block.chainid == MAINNET_CHAIN_ID) return MAINNET_ATTACK_REGISTRY;
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_ATTACK_REGISTRY;
        revert BCConfig__UnsupportedChainId(block.chainid);
    }

    function deployer() internal view returns (address) {
        if (block.chainid == MAINNET_CHAIN_ID) return MAINNET_DEPLOYER;
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_DEPLOYER;
        revert BCConfig__UnsupportedChainId(block.chainid);
    }

    function caip2ChainId() internal view returns (string memory) {
        if (block.chainid == MAINNET_CHAIN_ID) return MAINNET_CAIP2;
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_CAIP2;
        revert BCConfig__UnsupportedChainId(block.chainid);
    }

    function isBattleChain() internal view returns (bool) {
        return block.chainid == MAINNET_CHAIN_ID || block.chainid == TESTNET_CHAIN_ID;
    }

    error BCConfig__CreateXNotAvailable(uint256 chainId);

    function createX() internal view returns (address) {
        if (block.chainid == MAINNET_CHAIN_ID) return MAINNET_CREATEX;
        if (block.chainid == TESTNET_CHAIN_ID) return TESTNET_CREATEX;
        if (CreateXChains.isSupported(block.chainid)) return WELL_KNOWN_CREATEX;
        revert BCConfig__CreateXNotAvailable(block.chainid);
    }
}
