export function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

export function applyAllocation(totalUsd: number, weightPercent: number): number {
  return (totalUsd * weightPercent) / 100
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function targetPriceFromMultiplier(costBasis: number, multiplier: number): number {
  return costBasis * multiplier
}

export function stopLossPrice(costBasis: number, stopLossPercent: number): number {
  return costBasis * (1 - stopLossPercent / 100)
}
