// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BCBroadcastReader } from "bc-lib/BCBroadcastReader.sol";

contract BCBroadcastReaderHarness is BCBroadcastReader {
    function readAddresses(string memory scriptName, uint256 chainId) external view returns (address[] memory) {
        return readBroadcastAddresses(scriptName, chainId);
    }
}

contract BCBroadcastReaderTest is Test {
    BCBroadcastReaderHarness harness;

    function setUp() public {
        harness = new BCBroadcastReaderHarness();

        // Write a mock broadcast file
        string memory dir = "./broadcast/MockDeploy.s.sol/627/";
        vm.createDir(dir, true);

        string memory json = '{"transactions":[{"contractAddress":"0x1111111111111111111111111111111111111111"},'
            '{"contractAddress":"0x2222222222222222222222222222222222222222"},'
            '{"contractAddress":"0x0000000000000000000000000000000000000000"}]}';

        vm.writeFile(string.concat(dir, "run-latest.json"), json);
    }

    function test_readBroadcastAddresses_parsesContracts() public view {
        address[] memory addresses = harness.readAddresses("MockDeploy", 627);
        assertEq(addresses.length, 2);
        assertEq(addresses[0], 0x1111111111111111111111111111111111111111);
        assertEq(addresses[1], 0x2222222222222222222222222222222222222222);
    }

    function test_readBroadcastAddresses_filtersZeroAddress() public view {
        address[] memory addresses = harness.readAddresses("MockDeploy", 627);
        for (uint256 i; i < addresses.length; ++i) {
            assertTrue(addresses[i] != address(0));
        }
    }
}
