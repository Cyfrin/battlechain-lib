// SPDX-License-Identifier: MIT
// aderyn-ignore-next-line(push-zero-opcode,unspecific-solidity-pragma)
pragma solidity ^0.8.24;

import { BCBase } from "./BCBase.sol";
import { BCConfig } from "./BCConfig.sol";

/// @notice Off-chain query helpers for BattleChain block explorer APIs.
/// Requires FFI to be enabled (forge test --ffi / forge script --ffi).
abstract contract BCQuery is BCBase {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    string internal constant TESTNET_EXPLORER_API = "https://block-explorer-api.testnet.battlechain.com";
    string internal constant MAINNET_EXPLORER_API = "https://block-explorer-api.battlechain.com";

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error BCQuery__ApiFailed(address contractAddress);
    error BCQuery__UnsupportedChainForQuery(uint256 chainId);

    string private constant _UNDER_ATTACK = "UNDER_ATTACK";
    string private constant _PROMOTION_REQUESTED = "PROMOTION_REQUESTED";

    // -------------------------------------------------------------------------
    // Query functions
    // -------------------------------------------------------------------------

    /// @notice Checks if a contract is covered by an agreement that is in attackable mode
    /// (state is UNDER_ATTACK or PROMOTION_REQUESTED).
    /// Uses vm.ffi to call the block explorer API via curl.
    /// Requires `--ffi` flag when running forge script/test.
    // aderyn-ignore-next-line(internal-function-used-once)
    function isAttackable(address contractAddress) internal returns (bool) {
        string memory json = _queryAgreementByContract(contractAddress);

        bool hasCoverage = vm.parseJsonBool(json, ".hasCoverage");
        if (!hasCoverage) return false;

        for (uint256 i;; ++i) {
            string memory key = string.concat(".agreements[", vm.toString(i), "].state");
            if (!vm.keyExistsJson(json, key)) break;

            string memory state = vm.parseJsonString(json, key);
            if (_isAttackableState(state)) return true;
        }

        return false;
    }

    /// @notice Returns true if the state string represents an attackable agreement.
    function _isAttackableState(string memory state) private pure returns (bool) {
        return
            keccak256(bytes(state)) == keccak256(bytes(_UNDER_ATTACK))
                || keccak256(bytes(state)) == keccak256(bytes(_PROMOTION_REQUESTED));
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /// @notice Queries the block explorer API for agreement data covering a contract.
    /// Returns the raw JSON response string.
    function _queryAgreementByContract(address contractAddress) internal virtual returns (string memory) {
        string memory baseUrl = _explorerApiUrl();
        string memory addrStr = vm.toString(contractAddress);
        string memory url = string.concat(baseUrl, "/battlechain/agreement/by-contract/", addrStr);

        string[] memory cmd = new string[](5);
        cmd[0] = "curl";
        cmd[1] = "-sf";
        cmd[2] = "--max-time";
        cmd[3] = "10";
        cmd[4] = url;

        bytes memory result = vm.ffi(cmd);
        if (result.length == 0) {
            revert BCQuery__ApiFailed(contractAddress);
        }

        return string(result);
    }

    /// @notice Returns the block explorer API base URL for the current chain.
    function _explorerApiUrl() internal view virtual returns (string memory) {
        if (block.chainid == BCConfig.TESTNET_CHAIN_ID) return TESTNET_EXPLORER_API;
        if (block.chainid == BCConfig.MAINNET_CHAIN_ID) return MAINNET_EXPLORER_API;
        revert BCQuery__UnsupportedChainForQuery(block.chainid);
    }
}
