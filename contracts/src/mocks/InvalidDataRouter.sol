// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Always reverts — simulates invalid/malformed swap calldata (test only)
contract InvalidDataRouter {
    fallback() external {
        revert("InvalidDataRouter: invalid swap data");
    }
}
