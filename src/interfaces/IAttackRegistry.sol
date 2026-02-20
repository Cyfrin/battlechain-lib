// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAttackRegistry {
    function requestUnderAttack(address agreementAddress) external;

    function goToProduction(address agreementAddress) external;
}
