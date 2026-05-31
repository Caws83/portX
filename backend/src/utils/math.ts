export function applyAllocation(totalUsd: number, weightPercent: number): number {
  return (totalUsd * weightPercent) / 100
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}
