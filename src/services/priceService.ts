import type { Token } from '@/types/token'
import { DEMO_TOKENS } from '@/data/tokens'

/**
 * PRICE SERVICE PLACEHOLDER
 * Live: CoinGecko, Chainlink oracles, or DEX pool TWAP
 */
export async function fetchTokenPrices(_symbols: string[]): Promise<Record<string, number>> {
  await new Promise((r) => setTimeout(r, 200))
  return Object.fromEntries(DEMO_TOKENS.map((t) => [t.symbol, t.priceUsd]))
}

export async function fetchPortfolioValue(
  holdings: { symbol: string; balance: number }[]
): Promise<number> {
  const prices = await fetchTokenPrices(holdings.map((h) => h.symbol))
  return holdings.reduce((total, h) => {
    const price = prices[h.symbol] ?? 0
    return total + h.balance * price
  }, 0)
}

export function getDemoPrice(token: Token): number {
  return token.priceUsd
}
