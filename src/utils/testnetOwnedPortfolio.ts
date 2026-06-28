import { TESTNET_MULTI_TOKEN_BASKET_ID } from '@/data/testnetMultiTokenBasket'
import { TESTNET_MULTI_TOKEN_SELL_SYMBOLS } from '@/utils/testnetBasketHoldings'

/** Minimum balance to count as a meaningful Sepolia basket holding (dust filter) */
const MEANINGFUL_HOLDING_WEI = 1n

export function hasMeaningfulTestnetBasketHoldings(
  balancesWei: Record<string, bigint>,
): boolean {
  return TESTNET_MULTI_TOKEN_SELL_SYMBOLS.some(
    (symbol) => (balancesWei[symbol] ?? 0n) >= MEANINGFUL_HOLDING_WEI,
  )
}

export function isTestnetMultiTokenBasketOwned(
  basketId: string,
  balancesWei: Record<string, bigint>,
): boolean {
  return (
    basketId === TESTNET_MULTI_TOKEN_BASKET_ID &&
    hasMeaningfulTestnetBasketHoldings(balancesWei)
  )
}

export function getTestnetOwnedBasketIds(balancesWei: Record<string, bigint>): Set<string> {
  const ids = new Set<string>()
  if (hasMeaningfulTestnetBasketHoldings(balancesWei)) {
    ids.add(TESTNET_MULTI_TOKEN_BASKET_ID)
  }
  return ids
}

export function getTestnetSellableBasketIds(balancesWei: Record<string, bigint>): Set<string> {
  return getTestnetOwnedBasketIds(balancesWei)
}
