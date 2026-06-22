// SPDX-License-Identifier: MIT
// aderyn-ignore-next-line(push-zero-opcode,unspecific-solidity-pragma)
pragma solidity ^0.8.24;

/// @notice Minimal interface for the registry moderator.
/// approveAttack is the testnet self-approval entrypoint for an attack request.
interface IRegistryModerator {
    function approveAttack(address agreementAddress) external;
}
