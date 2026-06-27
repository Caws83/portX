// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";

/**
 * @title BundleExecutor
 * @author PortX
 *
 * @notice Sepolia testnet basket executor — NOT AUDITED — NOT FOR MAINNET
 *
 * Executes ordered swap legs through owner-allowlisted routers. Outputs are
 * settled to msg.sender via router recipient calldata and/or post-leg sweep.
 * Slippage is enforced per leg using balance-delta accounting on msg.sender.
 */
contract BundleExecutor {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    /// @notice One leg routed through an external aggregator (0x, 1inch, Uniswap, etc.)
    struct SwapCall {
        /// @dev Router contract to call (must be allowlisted)
        address router;
        /// @dev Encoded swap calldata from quote API — executor does not decode
        bytes data;
        /// @dev Input token; use address(0) for native ETH
        address tokenIn;
        /// @dev Amount of tokenIn (wei for ETH)
        uint256 amountIn;
        /// @dev Minimum acceptable output for this leg (enforced on-chain)
        uint256 minAmountOut;
        /// @dev Output token for balance-delta accounting (address(0) = native ETH)
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

    event RouterAllowlistUpdated(address indexed router, bool allowed);

    event FeeRecipientUpdated(address indexed feeRecipient);
    event BuyFeeUpdated(uint16 buyFeeBps);
    event SellFeeUpdated(uint16 sellFeeBps);
    event FeesEnabledUpdated(bool feesEnabled);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error FeeExceedsMax(uint16 requested, uint16 max);
    error ReentrancyGuardActive();
    error EmptyBasket();
    error RouterCallFailed(uint256 legIndex);
    error EthTransferFailed();
    error InvalidRecipient();
    error SlippageExceeded();
    error RouterNotAllowed(address router);

    // -------------------------------------------------------------------------
    // Types — protocol fee config (storage only; no collection in C-2)
    // -------------------------------------------------------------------------

    struct FeeConfig {
        address feeRecipient;
        uint16 buyFeeBps;
        uint16 sellFeeBps;
        uint16 maxFeeBps;
        bool feesEnabled;
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public owner;

    mapping(address => bool) public allowedRouters;

    address public feeRecipient;
    uint16 public buyFeeBps;
    uint16 public sellFeeBps;
    uint16 public constant maxFeeBps = 100;
    bool public feesEnabled;

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
    // Owner — router allowlist
    // -------------------------------------------------------------------------

    function setRouterAllowed(address router, bool allowed) external onlyOwner {
        if (router == address(0)) revert InvalidRecipient();
        allowedRouters[router] = allowed;
        emit RouterAllowlistUpdated(router, allowed);
    }

    // -------------------------------------------------------------------------
    // Owner — protocol fee config (no fee deduction until a future phase)
    // -------------------------------------------------------------------------

    function setFeeRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert InvalidRecipient();
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    function setBuyFeeBps(uint16 feeBps) external onlyOwner {
        if (feeBps > maxFeeBps) revert FeeExceedsMax(feeBps, maxFeeBps);
        buyFeeBps = feeBps;
        emit BuyFeeUpdated(feeBps);
    }

    function setSellFeeBps(uint16 feeBps) external onlyOwner {
        if (feeBps > maxFeeBps) revert FeeExceedsMax(feeBps, maxFeeBps);
        sellFeeBps = feeBps;
        emit SellFeeUpdated(feeBps);
    }

    function setFeesEnabled(bool enabled) external onlyOwner {
        feesEnabled = enabled;
        emit FeesEnabledUpdated(enabled);
    }

    function getFeeConfig() external view returns (FeeConfig memory) {
        return FeeConfig(feeRecipient, buyFeeBps, sellFeeBps, maxFeeBps, feesEnabled);
    }

    // -------------------------------------------------------------------------
    // External — basket execution
    // -------------------------------------------------------------------------

    /**
     * @notice Execute a basket of swaps in a single transaction.
     * @param basketId Off-chain basket / plan identifier for indexing
     * @param swaps Ordered legs — each calls an allowlisted `router` with `data`
     *
     * @dev Output settlement: routers should set recipient = msg.sender in calldata.
     *      Any output token or ETH left on this contract after a leg is swept to msg.sender.
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

            if (!allowedRouters[swap.router]) revert RouterNotAllowed(swap.router);

            uint256 balanceBefore = _balanceOf(swap.tokenOut, msg.sender);

            if (swap.tokenIn == address(0)) {
                if (swap.amountIn > ethRemaining) revert RouterCallFailed(i);
                ethRemaining -= swap.amountIn;
                _callRouter(swap.router, swap.data, swap.amountIn);
            } else {
                IERC20 token = IERC20(swap.tokenIn);
                token.transferFrom(msg.sender, address(this), swap.amountIn);
                token.approve(swap.router, swap.amountIn);
                _callRouter(swap.router, swap.data, 0);
                token.approve(swap.router, 0);
            }

            _sweepTokenTo(msg.sender, swap.tokenOut);

            uint256 balanceAfter = _balanceOf(swap.tokenOut, msg.sender);
            uint256 amountOut = balanceAfter - balanceBefore;

            if (amountOut < swap.minAmountOut) revert SlippageExceeded();

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

    function _callRouter(address router, bytes calldata data, uint256 ethValue) internal {
        (bool ok, ) = router.call{value: ethValue}(data);
        if (!ok) revert RouterCallFailed(type(uint256).max);
    }

    function _balanceOf(address token, address account) internal view returns (uint256) {
        if (token == address(0)) {
            return account.balance;
        }
        return IERC20(token).balanceOf(account);
    }

    function _sweepTokenTo(address to, address token) internal {
        if (token == address(0)) {
            uint256 ethBalance = address(this).balance;
            if (ethBalance > 0) {
                _transferEth(to, ethBalance);
            }
            return;
        }

        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        if (tokenBalance > 0) {
            IERC20(token).transfer(to, tokenBalance);
        }
    }

    function _transferEth(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }

    receive() external payable {}
}
