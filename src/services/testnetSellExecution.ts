import type { Address } from 'viem'
import type { ExecutionPlan } from '@/types/execution'
import type { TokenAllocation } from '@/types/token'
import { buildExecutionPlan } from '@/services/transactionBuilder'
import {
  buildSwapCalls,
  executionPlanToQuotePreview,
  type BundleExecutionPrepareResult,
} from '@/services/bundleExecutorWrite'
import { buildTestnetMultiTokenSellPreview } from '@/services/testnetMultiTokenSellQuote'

export async function refreshTestnetSellExecutionBundle(params: {
  plan: ExecutionPlan
  allocations: TokenAllocation[]
  balancesWei: Record<string, bigint>
  walletAddress: Address
}): Promise<{
  plan: ExecutionPlan
  prepareResult: Extract<BundleExecutionPrepareResult, { status: 'ready' }>
} | null> {
  const preview = await buildTestnetMultiTokenSellPreview({
    basketId: params.plan.basketId,
    basketName: params.plan.basketName,
    slippageBps: params.plan.slippageBps,
    allocations: params.allocations,
    balancesWei: params.balancesWei,
    recipient: params.walletAddress,
  })

  const freshPlan = buildExecutionPlan(preview, params.walletAddress, {
    walletConnected: true,
    currentChainId: preview.chainId,
  })

  const prepareResult = buildSwapCalls(executionPlanToQuotePreview(freshPlan), params.walletAddress)
  if (prepareResult.status !== 'ready') {
    return null
  }

  return { plan: freshPlan, prepareResult }
}
