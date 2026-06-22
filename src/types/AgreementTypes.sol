// SPDX-License-Identifier: MIT
// aderyn-ignore-next-line(push-zero-opcode,unspecific-solidity-pragma)
pragma solidity ^0.8.24;

// Re-exports the agreement types from the deployed battlechain-safe-harbor-contracts so that
// battlechain-lib stays downstream of the contracts (the deployed source of truth). Chain and
// Account are aliased to BcChain and BcAccount to avoid collisions with forge-std's Chain and
// Account structs.
import {
    AgreementDetails,
    Contact,
    Chain as BcChain,
    Account as BcAccount,
    ChildContractScope,
    BountyTerms,
    IdentityRequirements
} from "@battlechain-contracts/types/AgreementTypes.sol";
