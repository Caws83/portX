import { TESTNET_SEPOLIA_CHAIN_ID } from '@/config/testnetExecution'
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
  if (plan.legs.length !== 1) return false
  return plan.legs[0].quote.provider === 'uniswap-sepolia'
}
