// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";

/**
 * @title BundleExecutor
 * @author PortX (architecture draft)
 *
 * @notice FIRST DRAFT — NOT AUDITED — NOT DEPLOYED — NOT FOR PRODUCTION
 *
 * Planning contract for future one-transaction basket execution on Ethereum.
 * PortX Alpha today uses 0x quote calldata preview + dry-run simulation only;
 * this contract is NOT wired to the frontend or backend.
 *
 * Intended future flow:
 *   1. User approves ERC-20 inputs to BundleExecutor (or sends ETH)
 *   2. Off-chain quote service builds SwapCall[] with router calldata + minOut
 *   3. User signs one tx → executeBasket() loops external router calls
 *   4. Events index legs for portfolio / analytics
 *
 * Security: requires professional audit before any mainnet deployment.
 */
contract BundleExecutor {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    /// @notice One leg routed through an external aggregator (0x, 1inch, etc.)
    struct SwapCall {
        /// @dev Router contract to call (e.g. 0x allowance-holder target)
        address router;
        /// @dev Encoded swap calldata from quote API — executor does not decode
        bytes data;
        /// @dev Input token; use address(0) for native ETH
        address tokenIn;
        /// @dev Amount of tokenIn (wei for ETH)
        uint256 amountIn;
        /// @dev Slippage placeholder — minimum acceptable output (enforced off-chain today)
        uint256 minAmountOut;
        /// @dev Expected output token for indexing (not verified on-chain in v0 draft)
        address tokenOut;
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event SwapExecuted(
        bytes32 indexed basketId,
        uint256 indexed legIndex,
        address indexed router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event BasketExecuted(
        bytes32 indexed basketId,
        address indexed executor,
        address indexed initiator,
        uint256 legCount,
        uint256 timestamp
    );

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error ReentrancyGuardActive();
    error EmptyBasket();
    error RouterCallFailed(uint256 legIndex);
    error EthTransferFailed();
    error InvalidRecipient();

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public owner;

    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrancyGuardActive();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // -------------------------------------------------------------------------
    // External — basket execution (NOT ENABLED IN PORTX ALPHA)
    // -------------------------------------------------------------------------

    /**
     * @notice Execute a basket of swaps in a single transaction.
     * @param basketId Off-chain basket / plan identifier for indexing
     * @param swaps Ordered legs — each calls `router` with `data`
     *
     * @dev minAmountOut is a placeholder in this draft; production must enforce
     *      return values or use router-specific settlement checks post-audit.
     * @dev Caller must have approved ERC-20 inputs or attach ETH for native legs.
     */
    function executeBasket(
        bytes32 basketId,
        SwapCall[] calldata swaps
    ) external payable nonReentrant {
        if (swaps.length == 0) revert EmptyBasket();

        uint256 ethRemaining = msg.value;

        for (uint256 i = 0; i < swaps.length; ) {
            SwapCall calldata swap = swaps[i];
            uint256 amountOut;

            if (swap.tokenIn == address(0)) {
                if (swap.amountIn > ethRemaining) revert RouterCallFailed(i);
                ethRemaining -= swap.amountIn;
                amountOut = _callRouter(swap.router, swap.data, swap.amountIn);
            } else {
                IERC20 token = IERC20(swap.tokenIn);
                token.transferFrom(msg.sender, address(this), swap.amountIn);
                token.approve(swap.router, swap.amountIn);
                amountOut = _callRouter(swap.router, swap.data, 0);
                token.approve(swap.router, 0);
            }

            // Placeholder: minAmountOut should be enforced after audit
            // if (amountOut < swap.minAmountOut) revert SlippageExceeded(i);

            emit SwapExecuted(
                basketId,
                i,
                swap.router,
                swap.tokenIn,
                swap.tokenOut,
                swap.amountIn,
                amountOut
            );

            unchecked {
                ++i;
            }
        }

        emit BasketExecuted(basketId, address(this), msg.sender, swaps.length, block.timestamp);

        // Refund unused ETH to caller (draft behavior)
        if (address(this).balance > 0) {
            _transferEth(msg.sender, address(this).balance);
        }
    }

    // -------------------------------------------------------------------------
    // Owner rescue (stuck tokens / ETH after failed or partial flows)
    // -------------------------------------------------------------------------

    function rescueERC20(IERC20 token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidRecipient();
        token.transfer(to, amount);
    }

    function rescueETH(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidRecipient();
        _transferEth(to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidRecipient();
        owner = newOwner;
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _callRouter(address router, bytes calldata data, uint256 ethValue) internal returns (uint256) {
        (bool ok, bytes memory returndata) = router.call{value: ethValue}(data);
        if (!ok) revert RouterCallFailed(type(uint256).max);

        // Draft: routers return varying shapes; production must decode per provider
        if (returndata.length >= 32) {
            return abi.decode(returndata, (uint256));
        }
        return 0;
    }

    function _transferEth(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }

    receive() external payable {}
}
