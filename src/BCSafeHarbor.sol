// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { BCBase } from "bc-lib/BCBase.sol";
import { BCConfig } from "bc-lib/BCConfig.sol";
import {
    AgreementDetails,
    Contact,
    BcChain,
    BcAccount,
    ChildContractScope,
    BountyTerms,
    IdentityRequirements
} from "bc-lib/types/AgreementTypes.sol";
import { IAgreementFactory } from "bc-lib/interfaces/IAgreementFactory.sol";
import { IAgreement } from "bc-lib/interfaces/IAgreement.sol";
import { IAttackRegistry } from "bc-lib/interfaces/IAttackRegistry.sol";
import { IBCSafeHarborRegistry } from "bc-lib/interfaces/IBCSafeHarborRegistry.sol";

/// @notice Agreement builder and registry helpers for BattleChain Safe Harbor.
abstract contract BCSafeHarbor is BCBase {
    uint256 private constant DEFAULT_BOUNTY_PERCENTAGE = 10;
    uint256 private constant DEFAULT_BOUNTY_CAP_USD = 1_000_000;
    uint256 private constant DEFAULT_COMMITMENT_DAYS = 14;

    // -------------------------------------------------------------------------
    // Builder functions
    // -------------------------------------------------------------------------

    /// @notice Returns default bounty terms: 10%, $1M cap, retainable, anonymous, no aggregate cap.
    function defaultBountyTerms() internal pure returns (BountyTerms memory) {
        return BountyTerms({
            bountyPercentage: DEFAULT_BOUNTY_PERCENTAGE,
            bountyCapUsd: DEFAULT_BOUNTY_CAP_USD,
            retainable: true,
            identity: IdentityRequirements.Anonymous,
            diligenceRequirements: "",
            aggregateBountyCapUsd: 0
        });
    }

    /// @notice Converts addresses to BcAccount structs with ChildContractScope.All.
    function buildAccounts(address[] memory addresses) internal pure returns (BcAccount[] memory accounts) {
        accounts = new BcAccount[](addresses.length);
        for (uint256 i; i < addresses.length; ++i) {
            accounts[i] =
                BcAccount({ accountAddress: vm.toString(addresses[i]), childContractScope: ChildContractScope.All });
        }
    }

    /// @notice Builds a BcChain entry for the current network.
    function buildBattleChainScope(
        address[] memory contracts,
        address recoveryAddr
    )
        internal
        view
        returns (BcChain memory)
    {
        return BcChain({
            assetRecoveryAddress: vm.toString(recoveryAddr),
            accounts: buildAccounts(contracts),
            caip2ChainId: BCConfig.caip2ChainId()
        });
    }

    /// @notice Builds a full AgreementDetails struct with sensible defaults.
    function defaultAgreementDetails(
        string memory protocolName,
        Contact[] memory contacts,
        address[] memory contracts,
        address recoveryAddr
    )
        internal
        view
        returns (AgreementDetails memory)
    {
        BcChain[] memory chains = new BcChain[](1);
        chains[0] = buildBattleChainScope(contracts, recoveryAddr);

        return AgreementDetails({
            protocolName: protocolName,
            contactDetails: contacts,
            chains: chains,
            bountyTerms: defaultBountyTerms(),
            agreementURI: ""
        });
    }

    // -------------------------------------------------------------------------
    // Registry interaction
    // -------------------------------------------------------------------------

    /// @notice Creates an agreement via the AgreementFactory.
    function createAgreement(AgreementDetails memory details, address owner, bytes32 salt) internal returns (address) {
        return IAgreementFactory(_bcFactory()).create(details, owner, salt);
    }

    /// @notice Adopts an agreement in the BattleChain Safe Harbor Registry.
    function adoptAgreement(address agreementAddress) internal {
        IBCSafeHarborRegistry(_bcRegistry()).adoptSafeHarbor(agreementAddress);
    }

    /// @notice Sets the commitment window on an agreement.
    function setCommitmentWindow(address agreementAddress, uint256 durationDays) internal {
        uint256 newCantChangeUntil = block.timestamp + (durationDays * 1 days);
        IAgreement(agreementAddress).extendCommitmentWindow(newCantChangeUntil);
    }

    /// @notice Creates an agreement, sets a 14-day commitment window, and adopts it.
    function createAndAdoptAgreement(
        AgreementDetails memory details,
        address owner,
        bytes32 salt
    )
        internal
        returns (address agreement)
    {
        agreement = createAgreement(details, owner, salt);
        setCommitmentWindow(agreement, DEFAULT_COMMITMENT_DAYS);
        adoptAgreement(agreement);
    }

    // -------------------------------------------------------------------------
    // AttackRegistry interaction
    // -------------------------------------------------------------------------

    /// @notice Requests attack mode for an agreement.
    function requestAttackMode(address agreementAddress) internal {
        IAttackRegistry(_bcAttackRegistry()).requestUnderAttack(agreementAddress);
    }

    /// @notice Skips to production for an agreement.
    function skipToProduction(address agreementAddress) internal {
        IAttackRegistry(_bcAttackRegistry()).goToProduction(agreementAddress);
    }
}
