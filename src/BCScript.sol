// SPDX-License-Identifier: MIT
// aderyn-ignore-next-line(push-zero-opcode,unspecific-solidity-pragma)
pragma solidity ^0.8.24;

import { BCDeploy } from "./BCDeploy.sol";
import { BCSafeHarbor } from "./BCSafeHarbor.sol";
import { Contact } from "./types/AgreementTypes.sol";

/// @notice Single import combining BCDeploy and BCSafeHarbor with required protocol hooks.
abstract contract BCScript is BCDeploy, BCSafeHarbor {
    /// @notice The protocol name for the agreement.
    function _protocolName() internal pure virtual returns (string memory);

    /// @notice Contact details for security pre-notification.
    function _contacts() internal view virtual returns (Contact[] memory);

    /// @notice Address that receives recovered assets.
    function _recoveryAddress() internal view virtual returns (address);
}
