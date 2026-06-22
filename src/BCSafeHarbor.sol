// SPDX-License-Identifier: MIT
// aderyn-ignore-next-line(push-zero-opcode,unspecific-solidity-pragma)
pragma solidity ^0.8.24;

import { BCBase } from "./BCBase.sol";
import { BCConfig } from "./BCConfig.sol";
import {
    AgreementDetails,
    Contact,
    BcChain,
    BcAccount,
    ChildContractScope,
    BountyTerms,
    IdentityRequirements
} from "./types/AgreementTypes.sol";
import { IAgreementFactory } from "@battlechain-contracts/interface/IAgreementFactory.sol";
import { IAgreement } from "@battlechain-contracts/interface/IAgreement.sol";
import { IAttackRegistry } from "@battlechain-contracts/interface/IAttackRegistry.sol";
import { IBattleChainSafeHarborRegistry } from "@battlechain-contracts/interface/IBattleChainSafeHarborRegistry.sol";

/// @notice Agreement builder and registry helpers for BattleChain Safe Harbor.
abstract contract BCSafeHarbor is BCBase {
    uint256 private constant DEFAULT_BOUNTY_PERCENTAGE = 10;
    // aderyn-ignore-next-line(large-numeric-literal)
    uint256 private constant DEFAULT_BOUNTY_CAP_USD = 1_000_000;
    uint256 private constant DEFAULT_COMMITMENT_DAYS = 14;

    error BCSafeHarbor__NotBattleChain();

    // -------------------------------------------------------------------------
    // Builder functions
    // -------------------------------------------------------------------------

    /// @notice Returns default bounty terms: 10%, $1M cap, retainable, anonymous, no aggregate cap.
    // aderyn-ignore-next-line(internal-function-used-once)
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
    // aderyn-ignore-next-line(internal-function-used-once)
    function buildAccounts(address[] memory addresses) internal pure returns (BcAccount[] memory accounts) {
        accounts = new BcAccount[](addresses.length);
        for (uint256 i; i < addresses.length; ++i) {
            accounts[i] =
                BcAccount({ accountAddress: vm.toString(addresses[i]), childContractScope: ChildContractScope.All });
        }
    }

    /// @notice Builds a BcChain entry for any EVM chain.
    // aderyn-ignore-next-line(internal-function-used-once)
    function buildChainScope(
        address[] memory contracts,
        address recoveryAddr,
        string memory caip2Id
    )
        internal
        pure
        returns (BcChain memory)
    {
        return BcChain({
            assetRecoveryAddress: vm.toString(recoveryAddr), accounts: buildAccounts(contracts), caip2ChainId: caip2Id
        });
    }

    /// @notice Builds a BcChain entry for the current BattleChain network.
    // aderyn-ignore-next-line(internal-function-used-once)
    function buildBattleChainScope(
        address[] memory contracts,
        address recoveryAddr
    )
        internal
        view
        returns (BcChain memory)
    {
        return buildChainScope(contracts, recoveryAddr, BCConfig.caip2ChainId());
    }

    /// @notice Builds a full AgreementDetails struct with explicit parameters.
    function buildAgreementDetails(
        string memory protocolName,
        Contact[] memory contacts,
        BcChain[] memory chains,
        BountyTerms memory bountyTerms,
        string memory agreementURI
    )
        internal
        pure
        returns (AgreementDetails memory)
    {
        return AgreementDetails({
            protocolName: protocolName,
            contactDetails: contacts,
            chains: chains,
            bountyTerms: bountyTerms,
            agreementURI: agreementURI
        });
    }

    /// @notice Builds a full AgreementDetails struct with sensible defaults.
    /// On BattleChain: uses BattleChain chain scope and BattleChain Safe Harbor URI.
    /// On other chains: uses the current chain's CAIP-2 scope and generic Safe Harbor V3 URI.
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
        string memory uri;

        if (BCConfig.isBattleChain()) {
            chains[0] = buildBattleChainScope(contracts, recoveryAddr);
            uri = BCConfig.BATTLECHAIN_SAFE_HARBOR_URI;
        } else {
            string memory caip2 = string.concat("eip155:", vm.toString(block.chainid));
            chains[0] = buildChainScope(contracts, recoveryAddr, caip2);
            uri = BCConfig.SAFE_HARBOR_V3_URI;
        }

        return AgreementDetails({
            protocolName: protocolName,
            contactDetails: contacts,
            chains: chains,
            bountyTerms: defaultBountyTerms(),
            agreementURI: uri
        });
    }

    // -------------------------------------------------------------------------
    // Registry interaction
    // -------------------------------------------------------------------------

    /// @notice Creates an agreement via the AgreementFactory.
    // aderyn-ignore-next-line(internal-function-used-once)
    function createAgreement(AgreementDetails memory details, address owner, bytes32 salt) internal returns (address) {
        return IAgreementFactory(_bcFactory()).create(details, owner, salt);
    }

    /// @notice Adopts an agreement in the BattleChain Safe Harbor Registry.
    // aderyn-ignore-next-line(internal-function-used-once)
    function adoptAgreement(address agreementAddress) internal {
        IBattleChainSafeHarborRegistry(_bcRegistry()).adoptSafeHarbor(agreementAddress);
    }

    /// @notice Sets the commitment window on an agreement.
    // aderyn-ignore-next-line(internal-function-used-once)
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

    /// @notice Requests attack mode for an agreement. Only available on BattleChain.
    function requestAttackMode(address agreementAddress) internal {
        if (!_isBattleChain()) revert BCSafeHarbor__NotBattleChain();
        IAttackRegistry(_bcAttackRegistry()).requestUnderAttack(agreementAddress);
    }

    /// @notice Skips to production for an agreement. Only available on BattleChain.
    function skipToProduction(address agreementAddress) internal {
        if (!_isBattleChain()) revert BCSafeHarbor__NotBattleChain();
        IAttackRegistry(_bcAttackRegistry()).goToProduction(agreementAddress);
    }
}
