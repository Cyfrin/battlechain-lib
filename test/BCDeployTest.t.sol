// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BCDeploy } from "bc-lib/BCDeploy.sol";
import { MockBCDeployer, MockToken } from "test/mocks/MockBCInfra.sol";

contract BCDeployHarness is BCDeploy {
    function setUp() public {
        MockBCDeployer mockDeployer = new MockBCDeployer();
        _setBcAddresses(address(1), address(2), address(3), address(mockDeployer));
    }

    function deployViaCreate(bytes memory initCode) external returns (address) {
        return bcDeployCreate(initCode);
    }

    function deployViaCreate2(bytes32 salt, bytes memory initCode) external returns (address) {
        return bcDeployCreate2(salt, initCode);
    }

    function deployViaCreate3(bytes32 salt, bytes memory initCode) external returns (address) {
        return bcDeployCreate3(salt, initCode);
    }

    function deployed() external view returns (address[] memory) {
        return getDeployedContracts();
    }
}

contract BCDeployTest is Test {
    BCDeployHarness harness;

    function setUp() public {
        harness = new BCDeployHarness();
        harness.setUp();
    }

    function test_deployCreate_returnsNonZeroAddress() public {
        address deployed = harness.deployViaCreate(type(MockToken).creationCode);
        assertTrue(deployed != address(0));
    }

    function test_deployCreate_tracksDeployedContracts() public {
        harness.deployViaCreate(type(MockToken).creationCode);
        harness.deployViaCreate(type(MockToken).creationCode);

        address[] memory deployed = harness.deployed();
        assertEq(deployed.length, 2);
        assertTrue(deployed[0] != deployed[1]);
    }

    function test_deployCreate2_deterministicAddress() public {
        bytes32 salt = keccak256("test-salt");
        address deployed = harness.deployViaCreate2(salt, type(MockToken).creationCode);
        assertTrue(deployed != address(0));

        address[] memory all = harness.deployed();
        assertEq(all.length, 1);
        assertEq(all[0], deployed);
    }

    function test_getDeployedContracts_emptyInitially() public view {
        address[] memory deployed = harness.deployed();
        assertEq(deployed.length, 0);
    }
}
