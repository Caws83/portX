import { BUNDLE_EXECUTOR_SEPOLIA } from '@/config/contracts'
import { parseEther } from 'viem'

/**
 * Legacy Sepolia execution constants — prefer src/config/chainsRegistry.ts for chain IDs,
 * explorers, and contract addresses. Kept until quote/execution hooks migrate (CHAIN-3+).
 */
export const TESTNET_SEPOLIA_CHAIN_ID = 11155111 as const

export const TESTNET_BUNDLE_EXECUTOR_ADDRESS = BUNDLE_EXECUTOR_SEPOLIA.address

export const TESTNET_SWAP_ROUTER02_ADDRESS =
  '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' as const

export const TESTNET_QUOTER_V2_ADDRESS =
  '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3' as const

export const TESTNET_WETH_ADDRESS =
  '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as const

export const TESTNET_USDC_ADDRESS =
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const

export const TESTNET_UNISWAP_POOL_FEE = 3000 as const

/** Fallback when no buy amount is selected — prefer user-chosen notional */
export const TESTNET_DEFAULT_SWAP_AMOUNT_WEI = parseEther('0.0001')

/** Caps single-basket Sepolia ETH notional (~$1,250 at $2,500/ETH reference) */
export const TESTNET_MAX_SWAP_AMOUNT_WEI = parseEther('0.5')

export const TESTNET_DEFAULT_SLIPPAGE_BPS = 300 as const

/** Max SwapCall legs per testnet executeBasket transaction */
export const TESTNET_MAX_BASKET_LEGS = 4 as const
