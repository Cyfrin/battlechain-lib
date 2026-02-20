// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { BCBase } from "bc-lib/BCBase.sol";
import { IBCDeployer } from "bc-lib/IBCDeployer.sol";

/// @notice Deploy helpers via BattleChainDeployer.
/// Tracks all deployed addresses for use with BCSafeHarbor.
abstract contract BCDeploy is BCBase {
    address[] private _deployedContracts;

    function bcDeployCreate(bytes memory initCode) internal returns (address deployed) {
        deployed = IBCDeployer(_bcDeployer()).deployCreate(initCode);
        _deployedContracts.push(deployed);
    }

    function bcDeployCreate2(bytes32 salt, bytes memory initCode) internal returns (address deployed) {
        deployed = IBCDeployer(_bcDeployer()).deployCreate2(salt, initCode);
        _deployedContracts.push(deployed);
    }

    function bcDeployCreate3(bytes32 salt, bytes memory initCode) internal returns (address deployed) {
        deployed = IBCDeployer(_bcDeployer()).deployCreate3(salt, initCode);
        _deployedContracts.push(deployed);
    }

    /// @notice Returns all addresses deployed this session via bcDeploy* functions.
    function getDeployedContracts() internal view returns (address[] memory) {
        return _deployedContracts;
    }
}
