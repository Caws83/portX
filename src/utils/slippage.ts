export function bpsToPercent(bps: number): number {
  return bps / 100
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100)
}

export function formatSlippage(bps: number): string {
  return `${bpsToPercent(bps).toFixed(2)}%`
}

export function isHighSlippage(bps: number, threshold = 100): boolean {
  return bps >= threshold
}

export function applySlippage(amount: number, slippageBps: number, direction: 'min' | 'max' = 'min'): number {
  const factor = slippageBps / 10_000
  return direction === 'min' ? amount * (1 - factor) : amount * (1 + factor)
}
