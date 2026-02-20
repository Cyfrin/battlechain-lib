// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";

/// @notice Reads Foundry broadcast JSON files to discover deployed addresses.
/// Requires fs_permissions in consumer's foundry.toml.
abstract contract BCBroadcastReader is Script {
    /// @notice Reads deployed contract addresses from a broadcast file.
    /// @param scriptName The script name without .s.sol (e.g. "Deploy")
    /// @param chainId The chain ID used during broadcast
    /// @return addresses All contractAddress values from the broadcast transactions
    function readBroadcastAddresses(string memory scriptName, uint256 chainId)
        internal
        view
        returns (address[] memory)
    {
        string memory path = string.concat(
            "./broadcast/", scriptName, ".s.sol/", vm.toString(chainId), "/run-latest.json"
        );
        string memory json = vm.readFile(path);

        bytes memory txsRaw = vm.parseJson(json, ".transactions");
        TxReceipt[] memory txs = abi.decode(txsRaw, (TxReceipt[]));

        uint256 count;
        for (uint256 i; i < txs.length; ++i) {
            if (txs[i].contractAddress != address(0)) {
                ++count;
            }
        }

        address[] memory addresses = new address[](count);
        uint256 idx;
        for (uint256 i; i < txs.length; ++i) {
            if (txs[i].contractAddress != address(0)) {
                addresses[idx] = txs[i].contractAddress;
                ++idx;
            }
        }

        return addresses;
    }
}

/// @dev Struct matching the shape of broadcast transaction entries.
/// Only the fields we need are included — vm.parseJson ignores extras.
struct TxReceipt {
    address contractAddress;
}
