import { parseEther } from 'viem'
import type { TokenAllocation } from '@/types/token'
import { TESTNET_WETH_PRICE_USD } from '@/services/testnetPortfolioPricing'

export const TESTNET_BUY_AMOUNT_PRESETS_USD = [100, 250, 500, 1000] as const

export const TESTNET_BUY_AMOUNT_MIN_USD = 100

/** Convert USD notional to Sepolia ETH wei using fixed testnet WETH reference price. */
export function usdToTestnetEthWei(amountUsd: number): bigint {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error('Buy amount must be greater than zero')
  }
  const ethAmount = amountUsd / TESTNET_WETH_PRICE_USD
  return parseEther(ethAmount.toFixed(18))
}

export function formatTestnetEthNotional(amountUsd: number): string {
  const ethAmount = amountUsd / TESTNET_WETH_PRICE_USD
  return `${ethAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })} ETH`
}

export interface AllocationUsdSplit {
  symbol: string
  weightPercent: number
  usd: number
}

/** Split total USD buy amount across basket allocation weights. */
export function splitUsdAcrossAllocations(
  totalUsd: number,
  allocations: Pick<TokenAllocation, 'token' | 'weightPercent'>[],
): AllocationUsdSplit[] {
  return allocations.map((allocation) => ({
    symbol: allocation.token.symbol,
    weightPercent: allocation.weightPercent,
    usd: (totalUsd * allocation.weightPercent) / 100,
  }))
}

export function isPresetBuyAmountUsd(amountUsd: number): boolean {
  return TESTNET_BUY_AMOUNT_PRESETS_USD.some((preset) => preset === amountUsd)
}
