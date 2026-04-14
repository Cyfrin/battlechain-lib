// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BCQuery } from "src/BCQuery.sol";
import { MockBCDeployer, MockAgreementFactory, MockBCRegistry, MockAttackRegistry } from "test/mocks/MockBCInfra.sol";

contract BCQueryHarness is BCQuery {
    function configure(address registry, address factory, address attackRegistry, address deployer) external {
        _setBcAddresses(registry, factory, attackRegistry, deployer);
    }

    /// @dev Override to use mock shell script instead of real curl.
    function _queryAgreementByContract(address contractAddress) internal override returns (string memory) {
        string[] memory cmd = new string[](3);
        cmd[0] = "bash";
        cmd[1] = "test/mocks/mock_api.sh";
        cmd[2] = vm.toString(contractAddress);

        bytes memory result = vm.ffi(cmd);
        if (result.length == 0) {
            revert BCQuery__ApiFailed(contractAddress);
        }

        return string(result);
    }

    function exposedIsAttackable(address contractAddress) external returns (bool) {
        return isAttackable(contractAddress);
    }
}

contract BCQueryTest is Test {
    BCQueryHarness harness;

    function setUp() public {
        vm.chainId(627);

        harness = new BCQueryHarness();

        MockAgreementFactory factory = new MockAgreementFactory();
        MockBCRegistry registry = new MockBCRegistry();
        MockAttackRegistry attackRegistry = new MockAttackRegistry();
        MockBCDeployer deployer = new MockBCDeployer();

        harness.configure(address(registry), address(factory), address(attackRegistry), address(deployer));
    }

    function test_isAttackable_underAttack() public {
        assertTrue(harness.exposedIsAttackable(address(0xAAA)));
    }

    function test_isAttackable_promotionRequested() public {
        assertTrue(harness.exposedIsAttackable(address(0xCCC)));
    }

    function test_isAttackable_notAttackable() public {
        assertFalse(harness.exposedIsAttackable(address(0xBBB)));
    }

    function test_isAttackable_noCoverage() public {
        assertFalse(harness.exposedIsAttackable(address(0xEEE)));
    }

    function test_isAttackable_revertsOnApiError() public {
        vm.expectRevert();
        harness.exposedIsAttackable(address(0xDDD));
    }
}
