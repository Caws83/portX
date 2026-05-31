import type { Basket } from '../types/basket.js'
import { applyAllocation } from '../utils/math.js'

export interface AllocationLeg {
  symbol: string
  weightPercent: number
  inputAmountUsd: number
}

export function calculateBuyLegs(basket: Basket, totalInputUsd: number): AllocationLeg[] {
  return basket.allocations.map(({ token, weightPercent }) => ({
    symbol: token.symbol,
    weightPercent,
    inputAmountUsd: applyAllocation(totalInputUsd, weightPercent),
  }))
}

export function calculateSellLegs(
  basket: Basket,
  positionValueUsd: number
): AllocationLeg[] {
  return basket.allocations.map(({ token, weightPercent }) => ({
    symbol: token.symbol,
    weightPercent,
    inputAmountUsd: applyAllocation(positionValueUsd, weightPercent),
  }))
}

export function calculateSellAllLegs(
  holdings: { symbol: string; valueUsd: number }[]
): AllocationLeg[] {
  return holdings.map((h) => ({
    symbol: h.symbol,
    weightPercent: 0,
    inputAmountUsd: h.valueUsd,
  }))
}
