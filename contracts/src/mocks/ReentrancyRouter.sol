// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BundleExecutor} from "../BundleExecutor.sol";

/// @dev Attempts reentrant executeBasket during a leg callback (test only)
contract ReentrancyRouter {
    BundleExecutor public executor;
    bytes32 public basketId;

    function configure(BundleExecutor executor_, bytes32 basketId_) external {
        executor = executor_;
        basketId = basketId_;
    }

    fallback() external payable {
        BundleExecutor.SwapCall[] memory swaps = new BundleExecutor.SwapCall[](1);
        swaps[0] = BundleExecutor.SwapCall({
            router: address(this),
            data: "",
            tokenIn: address(0),
            amountIn: 0,
            minAmountOut: 0,
            tokenOut: address(0)
        });
        (bool ok, bytes memory err) = address(executor).call(
            abi.encodeCall(BundleExecutor.executeBasket, (basketId, swaps))
        );
        if (!ok) {
            assembly {
                revert(add(err, 32), mload(err))
            }
        }
    }
}
