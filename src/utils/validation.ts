export function isValidAllocationTotal(weights: number[], tolerance = 0.01): boolean {
  const total = weights.reduce((a, b) => a + b, 0)
  return Math.abs(total - 100) <= tolerance
}

export function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function isValidStopLossPercent(percent: number): boolean {
  return percent > 0 && percent < 100
}

export function isValidTakeProfitMultiplier(mult: number): boolean {
  return mult >= 1.1 && mult <= 100
}

export function parseNumberInput(value: string): number | null {
  const parsed = parseFloat(value)
  if (Number.isNaN(parsed)) return null
  return parsed
}
