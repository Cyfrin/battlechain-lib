// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Prefixed with BC to avoid collisions with forge-std's Chain and Account.

struct AgreementDetails {
    string protocolName;
    Contact[] contactDetails;
    BcChain[] chains;
    BountyTerms bountyTerms;
    string agreementURI;
}

struct Contact {
    string name;
    string contact;
}

struct BcChain {
    string assetRecoveryAddress;
    BcAccount[] accounts;
    string caip2ChainId;
}

struct BcAccount {
    string accountAddress;
    ChildContractScope childContractScope;
}

enum ChildContractScope {
    None,
    ExistingOnly,
    All,
    FutureOnly
}

struct BountyTerms {
    uint256 bountyPercentage;
    uint256 bountyCapUsd;
    bool retainable;
    IdentityRequirements identity;
    string diligenceRequirements;
    uint256 aggregateBountyCapUsd;
}

enum IdentityRequirements {
    Anonymous,
    Pseudonymous,
    Named
}
