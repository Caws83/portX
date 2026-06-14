import type { HeldToken } from '@/types/portfolio'
import type { Token } from '@/types/token'
import type { TokenAllocation } from '@/types/token'
import { applyAllocation } from '@/utils/math'

const DUST_VALUE_USD = 0.01

export function sumHeldValueUsd(holdings: HeldToken[]): number {
  return holdings.reduce((sum, holding) => sum + holding.valueUsd, 0)
}

/** Add basket purchase legs into token holdings (demo portfolio). */
export function applyBasketBuyToHoldings(
  holdings: HeldToken[],
  allocations: TokenAllocation[],
  purchaseUsd: number
): HeldToken[] {
  let next = [...holdings]
  for (const { token, weightPercent } of allocations) {
    const legUsd = applyAllocation(purchaseUsd, weightPercent)
    if (legUsd <= 0) continue
    next = addOrIncreaseHolding(next, token, legUsd)
  }
  return next
}

/** Remove basket position legs from token holdings (demo sell → USDC). */
export function applyBasketSellToHoldings(
  holdings: HeldToken[],
  allocations: TokenAllocation[],
  positionValueUsd: number
): HeldToken[] {
  const sellUsdBySymbol = new Map<string, number>()
  for (const { token, weightPercent } of allocations) {
    sellUsdBySymbol.set(token.symbol, applyAllocation(positionValueUsd, weightPercent))
  }

  return holdings
    .map((holding) => {
      const sellUsd = sellUsdBySymbol.get(holding.token.symbol) ?? 0
      if (sellUsd <= 0) return holding
      return reduceHoldingByUsd(holding, Math.min(sellUsd, holding.valueUsd))
    })
    .filter((holding): holding is HeldToken => holding !== null && holding.valueUsd >= DUST_VALUE_USD)
}

function addOrIncreaseHolding(
  holdings: HeldToken[],
  token: Token,
  addUsd: number
): HeldToken[] {
  const index = holdings.findIndex((h) => h.token.symbol === token.symbol)
  const addBalance = token.priceUsd > 0 ? addUsd / token.priceUsd : 0

  if (index >= 0) {
    const existing = holdings[index]
    const updated: HeldToken = {
      ...existing,
      valueUsd: existing.valueUsd + addUsd,
      balance: existing.balance + addBalance,
    }
    return holdings.map((h, i) => (i === index ? updated : h))
  }

  return [...holdings, { token, balance: addBalance, valueUsd: addUsd }]
}

function reduceHoldingByUsd(holding: HeldToken, reduceUsd: number): HeldToken | null {
  if (reduceUsd <= 0) return holding

  const newValueUsd = holding.valueUsd - reduceUsd
  if (newValueUsd < DUST_VALUE_USD) return null

  const ratio = holding.valueUsd > 0 ? newValueUsd / holding.valueUsd : 0
  return {
    ...holding,
    valueUsd: newValueUsd,
    balance: holding.balance * ratio,
  }
}
