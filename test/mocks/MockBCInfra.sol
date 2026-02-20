// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AgreementDetails } from "bc-lib/types/AgreementTypes.sol";

/// @dev Mock BattleChainDeployer that deploys contracts via CREATE and tracks them.
contract MockBCDeployer {
    event Deployed(address indexed deployer, address indexed deployed);

    function deployCreate(bytes memory initCode) external payable returns (address deployed) {
        assembly {
            deployed := create(callvalue(), add(initCode, 0x20), mload(initCode))
        }
        require(deployed != address(0), "CREATE failed");
        emit Deployed(msg.sender, deployed);
    }

    function deployCreate2(bytes32 salt, bytes memory initCode) external payable returns (address deployed) {
        assembly {
            deployed := create2(callvalue(), add(initCode, 0x20), mload(initCode), salt)
        }
        require(deployed != address(0), "CREATE2 failed");
        emit Deployed(msg.sender, deployed);
    }

    function deployCreate3(bytes32 salt, bytes memory initCode) external payable returns (address deployed) {
        // Simplified: just use CREATE2 for mock purposes
        assembly {
            deployed := create2(callvalue(), add(initCode, 0x20), mload(initCode), salt)
        }
        require(deployed != address(0), "CREATE3 failed");
        emit Deployed(msg.sender, deployed);
    }
}

/// @dev Mock AgreementFactory that deploys a MockAgreement.
contract MockAgreementFactory {
    address public lastAgreement;

    function create(AgreementDetails memory, address owner, bytes32) external returns (address) {
        MockAgreement agreement = new MockAgreement(owner);
        lastAgreement = address(agreement);
        return address(agreement);
    }
}

/// @dev Mock Agreement that tracks commitment window and owner.
contract MockAgreement {
    address public owner;
    uint256 public cantChangeUntil;

    constructor(address owner_) {
        owner = owner_;
    }

    function extendCommitmentWindow(uint256 newCantChangeUntil) external {
        cantChangeUntil = newCantChangeUntil;
    }
}

/// @dev Mock BattleChainSafeHarborRegistry that tracks adoptions.
contract MockBCRegistry {
    mapping(address => address) public agreements;

    function adoptSafeHarbor(address agreementAddress) external {
        agreements[msg.sender] = agreementAddress;
    }

    function getAgreement(address adopter) external view returns (address) {
        return agreements[adopter];
    }
}

/// @dev Mock AttackRegistry that tracks attack requests.
contract MockAttackRegistry {
    mapping(address => bool) public attackRequested;
    mapping(address => bool) public inProduction;

    function requestUnderAttack(address agreementAddress) external {
        attackRequested[agreementAddress] = true;
    }

    function goToProduction(address agreementAddress) external {
        inProduction[agreementAddress] = true;
    }
}

/// @dev Trivial contract for deploy tests.
contract MockToken {
    string public name = "Mock";
}
