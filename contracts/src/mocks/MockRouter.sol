// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "../interfaces/IERC20.sol";

/// @dev Simulates aggregator router success/failure for local tests only
contract MockRouter {
    bool public shouldFail;
    uint256 public returnAmount;
    IERC20 public outputToken;
    bool public transferOutputToOrigin;

    function setShouldFail(bool fail_) external {
        shouldFail = fail_;
    }

    function setReturnAmount(uint256 amount_) external {
        returnAmount = amount_;
    }

    function setOutputToken(address token_) external {
        outputToken = IERC20(token_);
    }

    function setTransferOutputToOrigin(bool enabled_) external {
        transferOutputToOrigin = enabled_;
    }

    /// @dev No receive() — ETH legs must hit this fallback so return data is encoded
    fallback(bytes calldata) external payable returns (bytes memory) {
        if (shouldFail) {
            revert("MockRouter: swap failed");
        }

        if (transferOutputToOrigin && address(outputToken) != address(0) && returnAmount > 0) {
            outputToken.transfer(tx.origin, returnAmount);
        }

        return abi.encode(returnAmount);
    }
}
