// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { BCDeploy } from "bc-lib/BCDeploy.sol";
import { BCSafeHarbor } from "bc-lib/BCSafeHarbor.sol";
import { Contact } from "bc-lib/types/AgreementTypes.sol";

/// @notice End-to-end example: deploy contracts, create agreement, adopt, enter attack mode.
/// Run against testnet fork:
///   forge script script/Example.s.sol --fork-url <testnet-rpc>
contract Example is BCDeploy, BCSafeHarbor {
    function run() external {
        vm.startBroadcast();

        // 1. Deploy via BattleChainDeployer (auto-registers with AttackRegistry)
        address token = bcDeployCreate(type(ExampleToken).creationCode);
        bcDeployCreate2(keccak256("vault-v1"), abi.encodePacked(type(ExampleVault).creationCode, abi.encode(token)));

        // 2. Build agreement with sensible defaults
        Contact[] memory contacts = new Contact[](1);
        contacts[0] = Contact({ name: "Security Team", contact: "security@example.xyz" });

        // 3. Create, commit, adopt
        address agreement = createAndAdoptAgreement(
            defaultAgreementDetails("ExampleProtocol", contacts, getDeployedContracts(), msg.sender),
            msg.sender,
            keccak256("v1")
        );

        // 4. Enter attack mode
        requestAttackMode(agreement);

        vm.stopBroadcast();
    }
}

/// @dev Minimal token for demonstration purposes.
contract ExampleToken {
    string public name = "Example";
}

/// @dev Minimal vault for demonstration purposes.
contract ExampleVault {
    address public immutable TOKEN;

    constructor(address token_) {
        TOKEN = token_;
    }
}
