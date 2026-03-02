// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { BCDeploy } from "bc-lib/BCDeploy.sol";
import { BCSafeHarbor } from "bc-lib/BCSafeHarbor.sol";
import { Contact } from "bc-lib/types/AgreementTypes.sol";

// =============================================================================
//  BattleChain Template Script
//
//  This script walks through a full BattleChain integration:
//
//    Step 1 — Deploy your contracts through the BattleChain Deployer
//    Step 2 — Set up your security contacts
//    Step 3 — Create and adopt a Safe Harbor agreement
//    Step 4 — Enter attack mode
//
//  Run:
//    forge script script/Example.s.sol --fork-url <testnet-rpc> --broadcast
// =============================================================================

contract Example is BCDeploy, BCSafeHarbor {
    function run() external {
        vm.startBroadcast();

        // =====================================================================
        //  Step 1: Deploy your contracts
        // =====================================================================
        //
        //  Use bcDeployCreate / bcDeployCreate2 / bcDeployCreate3 to deploy.
        //  Every contract deployed this way is automatically registered with the
        //  BattleChain AttackRegistry and tracked for use in your agreement.
        //
        //  Replace the example contracts below with your own.

        // Simple CREATE deploy
        address token = bcDeployCreate(type(ExampleToken).creationCode);

        // CREATE2 deploy with a salt (deterministic address)
        bcDeployCreate2(
            keccak256("vault-v1"),
            abi.encodePacked(type(ExampleVault).creationCode, abi.encode(token))
        );

        // =====================================================================
        //  Step 2: Set up your security contacts
        // =====================================================================
        //
        //  Add one or more contacts so whitehats can reach your team.

        Contact[] memory contacts = new Contact[](1);
        contacts[0] = Contact({
            name: "Security Team", // <-- Replace with your team name
            contact: "security@example.xyz" // <-- Replace with your contact
        });

        // =====================================================================
        //  Step 3: Create and adopt a Safe Harbor agreement
        // =====================================================================
        //
        //  `createAndAdoptAgreement` does three things in one call:
        //    1. Creates the agreement via the AgreementFactory
        //    2. Sets a 14-day commitment window (cannot change terms during this period)
        //    3. Adopts the agreement in the Safe Harbor Registry
        //
        //  `defaultAgreementDetails` builds an agreement with sensible defaults:
        //    - 10% bounty, $1M cap
        //    - Anonymous identity (no KYC required for whitehats)
        //    - All child contracts in scope
        //
        //  To customize bounty terms, see the "Custom bounty terms" section below.

        address agreement = createAndAdoptAgreement(
            defaultAgreementDetails(
                "ExampleProtocol", // <-- Replace with your protocol name
                contacts,
                getDeployedContracts(), // All contracts deployed in Step 1
                msg.sender // Asset recovery address
            ),
            msg.sender, // Agreement owner
            keccak256("v1") // Salt for deterministic agreement address
        );

        // =====================================================================
        //  Step 4: Enter attack mode
        // =====================================================================
        //
        //  Signals that your protocol is live and protected by BattleChain.
        //  Whitehats can now rescue funds under your Safe Harbor terms.

        requestAttackMode(agreement);

        vm.stopBroadcast();
    }
}

// =============================================================================
//  Custom bounty terms (optional)
// =============================================================================
//
//  If the defaults (10% bounty, $1M cap, anonymous) don't fit your protocol,
//  you can build custom BountyTerms:
//
//  import { BountyTerms, IdentityRequirements } from "bc-lib/types/AgreementTypes.sol";
//
//    BountyTerms memory terms = BountyTerms({
//        bountyPercentage: 15,                         // 15% of rescued funds
//        bountyCapUsd: 2_000_000,                      // $2M cap per rescue
//        retainable: true,                             // whitehat keeps the bounty
//        identity: IdentityRequirements.Pseudonymous,  // require pseudonymous ID
//        diligenceRequirements: "",                    // additional requirements (free text)
//        aggregateBountyCapUsd: 10_000_000             // $10M total across all rescues (0 = no cap)
//    });
//
//  Then pass them into a custom AgreementDetails struct instead of using
//  `defaultAgreementDetails`.

// =============================================================================
//  Example contracts (replace with your own)
// =============================================================================

contract ExampleToken {
    string public name = "Example";
}

contract ExampleVault {
    address public immutable TOKEN;

    constructor(address token_) {
        TOKEN = token_;
    }
}