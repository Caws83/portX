import type { Basket } from '@/types/basket'
import type { Token } from '@/types/token'
import type { AllocationLeg } from '@/types/quote'
import type { HeldToken } from '@/types/portfolio'
import { applyAllocation } from '@/utils/math'

/**
 * Converts a basket + input amount into per-token allocation legs.
 * Example: $1,000 USDC → ETH 40%, WBTC 25%, etc.
 */
export function calculateBasketBuyAllocations(
  basket: Basket,
  totalInputUsd: number,
  inputDecimals = 6
): AllocationLeg[] {
  return basket.allocations.map(({ token, weightPercent }) => {
    const inputAmountUsd = applyAllocation(totalInputUsd, weightPercent)
    return {
      token,
      weightPercent,
      inputAmountUsd,
      inputAmount: usdToTokenUnits(inputAmountUsd, inputDecimals),
    }
  })
}

/** Sell basket: each held allocation token → stablecoin */
export function calculateBasketSellAllocations(
  basket: Basket,
  heldAmountsUsd: Record<string, number>,
  _outputToken: Token
): AllocationLeg[] {
  return basket.allocations.map(({ token, weightPercent }) => {
    const inputAmountUsd = heldAmountsUsd[token.symbol] ?? applyAllocation(
      Object.values(heldAmountsUsd).reduce((a, b) => a + b, 0),
      weightPercent
    )
    return {
      token,
      weightPercent,
      inputAmountUsd,
      inputAmount: tokenAmountFromUsd(token, inputAmountUsd),
    }
  })
}

/** Sell all: every held token → stablecoin */
export function calculateSellAllAllocations(
  holdings: HeldToken[],
  _outputToken: Token
): AllocationLeg[] {
  const total = holdings.reduce((a, h) => a + h.valueUsd, 0)
  return holdings.map((h) => ({
    token: h.token,
    weightPercent: total > 0 ? (h.valueUsd / total) * 100 : 0,
    inputAmountUsd: h.valueUsd,
    inputAmount: tokenAmountFromUsd(h.token, h.valueUsd),
  }))
}

function usdToTokenUnits(usd: number, decimals: number): string {
  const units = usd * Math.pow(10, decimals)
  return Math.floor(units).toString()
}

function tokenAmountFromUsd(token: Token, usd: number): string {
  if (token.priceUsd <= 0) return '0'
  const amount = usd / token.priceUsd
  const units = amount * Math.pow(10, token.decimals)
  return Math.floor(units).toString()
}
