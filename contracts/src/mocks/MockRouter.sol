// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Simulates aggregator router success/failure for local tests only
contract MockRouter {
    bool public shouldFail;
    uint256 public returnAmount;

    function setShouldFail(bool fail_) external {
        shouldFail = fail_;
    }

    function setReturnAmount(uint256 amount_) external {
        returnAmount = amount_;
    }

    /// @dev No receive() — ETH legs must hit this fallback so return data is encoded
    fallback(bytes calldata) external payable returns (bytes memory) {
        if (shouldFail) {
            revert("MockRouter: swap failed");
        }
        return abi.encode(returnAmount);
    }
}
