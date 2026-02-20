// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal interface for BattleChainDeployer.
/// Avoids importing the full CreateX dependency tree.
interface IBCDeployer {
    function deployCreate(bytes memory initCode) external payable returns (address);

    function deployCreate2(bytes32 salt, bytes memory initCode) external payable returns (address);

    function deployCreate3(bytes32 salt, bytes memory initCode) external payable returns (address);
}
