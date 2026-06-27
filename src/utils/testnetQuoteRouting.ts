import { ENABLE_LIVE_EXECUTION, ENABLE_TESTNET_MODE } from '@/config/features'
import { TESTNET_SEPOLIA_CHAIN_ID } from '@/config/testnetExecution'
import { isTestnetMultiTokenBasket } from '@/data/testnetMultiTokenBasket'
import type { ExecutionPlan } from '@/types/execution'
import { isTestnetSepoliaUniswapPlan } from '@/utils/testnetPreview'
import type { MainnetPilotQuoteSource } from '@/utils/mainnetPilotReadiness'

export const TESTNET_EXECUTION_ENV_MESSAGE =
  'Enable testnet mode to execute Sepolia trades. Set VITE_APP_MODE=testnet and VITE_ENABLE_LIVE_EXECUTION=true.'

/** Sepolia multi-token beta must never use API / local fallback quotes */
export function isTestnetRoutingBasket(basketId?: string | null): boolean {
  return isTestnetMultiTokenBasket(basketId)
}

export function isSepoliaChain(chainId: number): boolean {
  return chainId === TESTNET_SEPOLIA_CHAIN_ID
}

/** All env + wallet conditions for Sepolia Uniswap testnet quotes */
export function shouldUseTestnetUniswapQuotePath(chainId: number): boolean {
  return ENABLE_TESTNET_MODE && ENABLE_LIVE_EXECUTION && isSepoliaChain(chainId)
}

export function getTestnetQuoteBlockMessage(chainId: number): string {
  if (isSepoliaChain(chainId)) {
    return TESTNET_EXECUTION_ENV_MESSAGE
  }
  return 'Switch wallet to Sepolia (chain 11155111) for testnet basket preview.'
}

export function shouldShowTestnetEnvWarning(chainId: number, isConnected: boolean): boolean {
  return isConnected && isSepoliaChain(chainId) && !shouldUseTestnetUniswapQuotePath(chainId)
}

export function shouldSuppressMainnetPilotPanel(context: {
  quoteSource: MainnetPilotQuoteSource
  chainId?: number
  plan: ExecutionPlan | null
}): boolean {
  if (!ENABLE_TESTNET_MODE) return false

  if (context.quoteSource === 'testnet') return true

  if (context.plan && isTestnetSepoliaUniswapPlan(context.plan)) return true

  if (
    context.chainId === TESTNET_SEPOLIA_CHAIN_ID &&
    context.plan &&
    isTestnetRoutingBasket(context.plan.basketId)
  ) {
    return true
  }

  return false
}

export function planUsesUniswapSepolia(plan: ExecutionPlan | null): boolean {
  return Boolean(plan && plan.legs.every((leg) => leg.quote.provider === 'uniswap-sepolia'))
}
