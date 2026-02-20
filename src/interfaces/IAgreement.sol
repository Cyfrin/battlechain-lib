// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AgreementDetails, Contact, BcChain, BcAccount, BountyTerms } from "bc-lib/types/AgreementTypes.sol";

interface IAgreement {
    function extendCommitmentWindow(uint256 newCantChangeUntil) external;

    function setProtocolName(string memory protocolName) external;

    function setContactDetails(Contact[] memory contactDetails) external;

    function addOrSetChains(BcChain[] memory chains) external;

    function removeChains(string[] memory caip2ChainIds) external;

    function addAccounts(string memory caip2ChainId, BcAccount[] memory newAccounts) external;

    function removeAccounts(string memory caip2ChainId, string[] memory accountAddresses) external;

    function setBountyTerms(BountyTerms memory bountyTerms) external;

    function setAgreementURI(string memory agreementURI) external;

    function isContractInScope(address contractAddress) external view returns (bool);

    function getCantChangeUntil() external view returns (uint256);

    function getDetails() external view returns (AgreementDetails memory);

    function getProtocolName() external view returns (string memory);

    function getBountyTerms() external view returns (BountyTerms memory);

    function getAgreementURI() external view returns (string memory);

    function getRegistry() external view returns (address);

    function getChainIds() external view returns (string[] memory);

    function getBattleChainCaip2ChainId() external view returns (string memory);

    function getBattleChainScopeAddresses() external view returns (address[] memory);

    function getBattleChainScopeCount() external view returns (uint256);

    function owner() external view returns (address);
}
