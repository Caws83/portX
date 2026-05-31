import type { BasketQuotePreview } from '@/types/quote'
import type { BuiltTransaction, ExecutionPlan, ExecutionResult, SwapLeg } from '@/types/execution'
import { validateExecutionPlan } from '@/api/quotes'

let planCounter = 0

export function buildExecutionPlan(
  preview: BasketQuotePreview,
  walletAddress?: string
): ExecutionPlan {
  const legs: SwapLeg[] = preview.legs.map((leg, index) => ({
    quote: leg.bestQuote,
    index,
  }))

  return {
    id: `portx-exec-${Date.now()}-${++planCounter}`,
    type: preview.type,
    basketId: preview.basketId,
    basketName: preview.basketName,
    legs,
    totalInputUsd: preview.totalInputUsd,
    totalOutputUsd: preview.totalOutputUsd,
    totalGasUsd: preview.totalGasUsd,
    slippageBps: preview.slippageBps,
    chainId: preview.chainId,
    walletAddress,
    isDemo: preview.isDemo,
    warnings: preview.warnings,
  }
}

/** Converts execution plan into wallet-ready transactions (one per swap leg at MVP) */
export function buildTransactions(plan: ExecutionPlan): BuiltTransaction[] {
  return plan.legs.map((leg) => ({
    legIndex: leg.index,
    to: leg.quote.routerAddress,
    data: leg.quote.calldata,
    value: '0',
    gasEstimate: leg.quote.estimatedGasUnits.toString(),
    chainId: plan.chainId,
    description: `${leg.quote.inputToken.symbol} → ${leg.quote.outputToken.symbol} via ${leg.quote.provider}`,
    provider: leg.quote.provider,
  }))
}

export async function validatePlanWithBackend(plan: ExecutionPlan): Promise<ExecutionPlan> {
  if (plan.isDemo) return plan
  try {
    // BACKEND QUOTE VALIDATION: re-fetch and compare before signing
    return await validateExecutionPlan(plan)
  } catch {
    return plan
  }
}

/**
 * Demo execution — does NOT send on-chain transactions.
 * Live: use executeWithWallet() with wagmi writeContract / sendTransaction.
 */
export async function executeDemoPlan(plan: ExecutionPlan): Promise<ExecutionResult> {
  await simulateLatency()
  const txHashes = plan.legs.map(
    (_, i) => '0x' + i.toString(16).padStart(64, '0')
  )
  return {
    success: true,
    txHashes,
    message: `Demo execution complete — ${plan.legs.length} swap leg(s) simulated.`,
  }
}

/**
 * WALLET EXECUTION PLACEHOLDER
 * Live flow:
 * 1. buildTransactions(plan)
 * 2. For each tx: wagmi sendTransaction or writeContract with calldata from 0x/1inch
 * 3. waitForTransactionReceipt
 * 4. Update portfolio state from on-chain balances
 */
export async function executeWithWallet(
  _plan: ExecutionPlan,
  _builtTxs: BuiltTransaction[]
): Promise<ExecutionResult> {
  // TODO: wagmi writeContract / sendTransaction — user signs each swap non-custodially
  throw new Error('Live wallet execution not enabled. Use demo mode.')
}

function simulateLatency(): Promise<void> {
  return new Promise((r) => setTimeout(r, 600))
}
