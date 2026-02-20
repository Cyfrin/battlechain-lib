// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { BCConfig } from "bc-lib/BCConfig.sol";

/// @notice Shared base providing BattleChain address resolution.
/// On known chains (627, etc.) addresses resolve from BCConfig.
/// On Anvil (31337) or unknown chains, use _setBcAddresses() to set overrides.
abstract contract BCBase is Script {
    address private _registryOverride;
    address private _factoryOverride;
    address private _attackRegistryOverride;
    address private _deployerOverride;

    /// @notice Set address overrides for local testing or unsupported chains.
    function _setBcAddresses(address registry_, address factory_, address attackRegistry_, address deployer_) internal {
        _registryOverride = registry_;
        _factoryOverride = factory_;
        _attackRegistryOverride = attackRegistry_;
        _deployerOverride = deployer_;
    }

    function _bcRegistry() internal view returns (address) {
        if (_registryOverride != address(0)) return _registryOverride;
        return BCConfig.registry();
    }

    function _bcFactory() internal view returns (address) {
        if (_factoryOverride != address(0)) return _factoryOverride;
        return BCConfig.agreementFactory();
    }

    function _bcAttackRegistry() internal view returns (address) {
        if (_attackRegistryOverride != address(0)) return _attackRegistryOverride;
        return BCConfig.attackRegistry();
    }

    function _bcDeployer() internal view returns (address) {
        if (_deployerOverride != address(0)) return _deployerOverride;
        return BCConfig.deployer();
    }
}
