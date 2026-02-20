// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AgreementDetails } from "bc-lib/types/AgreementTypes.sol";

interface IAgreementFactory {
    function create(
        AgreementDetails memory details,
        address owner,
        bytes32 salt
    )
        external
        returns (address agreementAddress);

    function getRegistry() external view returns (address);

    function getBattleChainCaip2ChainId() external view returns (string memory);

    function isAgreementContract(address agreementAddress) external view returns (bool);
}
