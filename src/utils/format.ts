export function formatUsd(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number, signed = true): string {
  const prefix = signed && value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(2)}%`
}

export function formatTokenAmount(amount: number, decimals = 4): string {
  if (amount < 0.0001) return amount.toExponential(2)
  return amount.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatMultiplier(mult: number): string {
  return `${mult.toFixed(1)}x`
}
