import { formatEther, formatUnits } from 'viem'
import {
  TESTNET_MAX_BASKET_LEGS,
  TESTNET_SEPOLIA_CHAIN_ID,
} from '@/config/testnetExecution'
import type { ExecutionPlan } from '@/types/execution'
import type { BasketQuotePreview } from '@/types/quote'

export function isTestnetSepoliaUniswapPreview(preview: BasketQuotePreview): boolean {
  return (
    preview.chainId === TESTNET_SEPOLIA_CHAIN_ID &&
    preview.legs.some((leg) => leg.bestQuote.provider === 'uniswap-sepolia')
  )
}

export function isTestnetSepoliaUniswapPlan(plan: ExecutionPlan): boolean {
  if (plan.isDemo) return false
  if (plan.chainId !== TESTNET_SEPOLIA_CHAIN_ID) return false
  if (plan.legs.length < 1 || plan.legs.length > TESTNET_MAX_BASKET_LEGS) return false
  return plan.legs.every((leg) => leg.quote.provider === 'uniswap-sepolia')
}

export function sumTestnetPlanInputWei(plan: ExecutionPlan): bigint {
  return plan.legs.reduce((sum, leg) => sum + BigInt(leg.quote.inputAmount), 0n)
}

export function sumTestnetPlanOutputAmount(plan: ExecutionPlan): bigint {
  return plan.legs.reduce((sum, leg) => sum + BigInt(leg.quote.outputAmount), 0n)
}

export function formatTestnetPlanTotalInput(plan: ExecutionPlan): string {
  return `${formatEther(sumTestnetPlanInputWei(plan))} ETH`
}

export function formatTestnetPlanTotalOutput(plan: ExecutionPlan): string {
  if (plan.legs.length === 0) return '—'
  const decimals = plan.legs[0].quote.outputToken.decimals
  const symbol = plan.legs[0].quote.outputToken.symbol
  const total = sumTestnetPlanOutputAmount(plan)
  const value = Number.parseFloat(formatUnits(total, decimals))
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${symbol}`
}

export function formatTestnetLegOutput(
  outputAmount: string,
  decimals: number,
  symbol: string,
): string {
  try {
    const value = Number.parseFloat(formatUnits(BigInt(outputAmount), decimals))
    return `${value.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${symbol}`
  } catch {
    return `${outputAmount} ${symbol}`
  }
}
