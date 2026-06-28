import { TESTNET_SEPOLIA_CHAIN_ID } from '@/config/testnetExecution'
import { TESTNET_MULTI_TOKEN_BASKET_ID } from '@/data/testnetMultiTokenBasket'

/** Basket tokens that can be sold back to USDC on Sepolia testnet */
export const TESTNET_MULTI_TOKEN_SELL_SYMBOLS = ['LINK', 'UNI', 'WETH', 'AAVE'] as const

export type TestnetMultiTokenSellSymbol = (typeof TESTNET_MULTI_TOKEN_SELL_SYMBOLS)[number]

/** True when wallet holds any sellable basket token above zero wei */
export function hasTestnetMultiTokenBasketHoldings(
  balancesWei: Record<string, bigint>,
): boolean {
  return TESTNET_MULTI_TOKEN_SELL_SYMBOLS.some((symbol) => (balancesWei[symbol] ?? 0n) > 0n)
}

export interface TestnetBasketSellEligibility {
  enableTestnetMode: boolean
  enableLiveExecution: boolean
  walletConnected: boolean
  chainId?: number
  basketId: string
  balancesWei: Record<string, bigint>
}

export interface TestnetBasketSellPreviewEligibility {
  enableTestnetMode: boolean
  walletConnected: boolean
  basketId: string
  balancesWei: Record<string, bigint>
}

/** Show Sell when wallet holds basket tokens — preview does not require live execution gates */
export function canPreviewTestnetMultiTokenBasketSell(
  params: TestnetBasketSellPreviewEligibility,
): boolean {
  return (
    params.enableTestnetMode &&
    params.walletConnected &&
    params.basketId === TESTNET_MULTI_TOKEN_BASKET_ID &&
    hasTestnetMultiTokenBasketHoldings(params.balancesWei)
  )
}

/**
 * Sepolia Multi-Token Beta can execute sell when live execution gates pass.
 */
export function canShowTestnetMultiTokenBasketSell(
  params: TestnetBasketSellEligibility,
): boolean {
  return (
    canPreviewTestnetMultiTokenBasketSell(params) &&
    params.enableLiveExecution &&
    params.chainId === TESTNET_SEPOLIA_CHAIN_ID
  )
}
