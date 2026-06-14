import type { BasketQuotePreview, QuoteResponse } from '@/types/quote'
import type {
  BuiltTransaction,
  CalldataStatus,
  ExecutionPlan,
  ExecutionReadiness,
  ExecutionResult,
  ExecutionStatus,
  LegExecutionInfo,
  LiveExecutionPlanSummary,
  SwapLeg,
} from '@/types/execution'
import { isSupportedExecutionChain } from '@/types/execution'
import { validateExecutionPlan } from '@/api/quotes'
import { isZeroAddress } from '@/utils/addresses'
import {
  emptyQuoteExecutionMetadata,
  truncateExecutionAddress,
} from '@/utils/executionMetadata'

let planCounter = 0

const DEMO_CALLDATA_MARKERS = ['_DEMO_CALLDATA', '_DEMO_']

export function truncateAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail + 2) return address
  return `${address.slice(0, head + 2)}…${address.slice(-tail)}`
}

export function truncateCalldata(calldata: string, max = 18): string {
  if (calldata.length <= max) return calldata
  return `${calldata.slice(0, max)}…`
}

export function isValidRouterAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address) && !isZeroAddress(address)
}

/** True when calldata looks like a real 0x transaction payload (not demo placeholders) */
export function isValidCalldata(calldata: string): boolean {
  if (!calldata?.startsWith('0x')) return false
  const body = calldata.slice(2)
  if (body.length < 16) return false
  if (!/^[0-9a-fA-F]+$/.test(body)) return false
  if (/^0+$/.test(body)) return false
  if (DEMO_CALLDATA_MARKERS.some((marker) => calldata.includes(marker))) return false
  return true
}

export function getCalldataStatus(quote: QuoteResponse, isDemoPlan: boolean): CalldataStatus {
  if (quote.provider === 'unsupported') return 'unsupported'
  if (isDemoPlan) return 'demo'
  if (quote.provider === '0x' && isValidCalldata(quote.calldata) && isValidRouterAddress(quote.routerAddress)) {
    return 'available'
  }
  if (isValidCalldata(quote.calldata) && isValidRouterAddress(quote.routerAddress)) {
    return 'available'
  }
  return 'missing'
}

export function hasUnsupportedRoute(quotes: QuoteResponse[]): boolean {
  return quotes.some((q) => q.provider === 'unsupported')
}

export function hasZeroExRoute(quotes: QuoteResponse[]): boolean {
  return quotes.some((q) => q.provider === '0x')
}

export function allZeroExCalldataAvailable(quotes: QuoteResponse[], isDemoPlan: boolean): boolean {
  if (isDemoPlan) return false
  const zeroExLegs = quotes.filter((q) => q.provider === '0x')
  if (zeroExLegs.length === 0) return false
  return zeroExLegs.every(
    (q) => isValidCalldata(q.calldata) && isValidRouterAddress(q.routerAddress)
  )
}

export function getExecutionStatus(quotes: QuoteResponse[], isDemoPlan: boolean): ExecutionStatus {
  if (isDemoPlan) return 'preview_only'
  if (hasUnsupportedRoute(quotes)) return 'preview_only'
  if (hasZeroExRoute(quotes) && allZeroExCalldataAvailable(quotes, isDemoPlan)) {
    return 'ready_for_wallet'
  }
  return 'preview_only'
}

export function getExecutionStatusLabel(status: ExecutionStatus): string {
  return status === 'ready_for_wallet' ? 'Ready for wallet execution' : 'Preview only'
}

function legExecutionInfoFromQuote(
  quote: QuoteResponse,
  index: number,
  isDemoPlan: boolean,
  chainId?: number
): LegExecutionInfo {
  const calldataStatus = getCalldataStatus(quote, isDemoPlan)
  const execution = quote.execution ?? emptyQuoteExecutionMetadata(chainId)
  const routerAddress = execution.transactionTo ?? quote.routerAddress
  const calldata = execution.transactionData ?? quote.calldata

  return {
    index,
    provider: quote.provider,
    inputSymbol: quote.inputToken.symbol,
    outputSymbol: quote.outputToken.symbol,
    routerAddress,
    routerDisplay: isValidRouterAddress(routerAddress)
      ? truncateAddress(routerAddress)
      : 'Not available',
    calldata,
    calldataDisplay: calldata?.startsWith('0x')
      ? truncateCalldata(calldata)
      : 'Not available',
    calldataStatus,
    hasExecutableCalldata: execution.hasExecutableCalldata,
    hasExactSellAmount: execution.hasExactSellAmount,
    requiresApproval: execution.requiresApproval,
    spender: execution.spender,
    spenderDisplay: truncateExecutionAddress(execution.spender),
    transactionTo: execution.transactionTo,
    transactionToDisplay: truncateExecutionAddress(execution.transactionTo ?? routerAddress),
    transactionValue: execution.transactionValue,
    sellAmount: execution.sellAmount ?? quote.inputAmount,
  }
}

export function buildLegExecutionInfo(plan: ExecutionPlan): LegExecutionInfo[] {
  return plan.legs.map((leg) =>
    legExecutionInfoFromQuote(leg.quote, leg.index, plan.isDemo, plan.chainId)
  )
}

export function buildLiveExecutionSummaryFromPreview(preview: BasketQuotePreview): LiveExecutionPlanSummary {
  const quotes = preview.legs.map((l) => l.bestQuote)
  const status = getExecutionStatus(quotes, preview.isDemo)
  return {
    status,
    statusLabel: getExecutionStatusLabel(status),
    hasZeroExRoute: hasZeroExRoute(quotes),
    allCalldataAvailable: allZeroExCalldataAvailable(quotes, preview.isDemo),
    legs: preview.legs.map((leg, index) =>
      legExecutionInfoFromQuote(leg.bestQuote, index, preview.isDemo, preview.chainId)
    ),
  }
}

export function assessExecutionReadiness(
  plan: ExecutionPlan,
  context: { walletConnected: boolean; currentChainId?: number }
): ExecutionReadiness {
  const quotes = plan.legs.map((l) => l.quote)
  const status = getExecutionStatus(quotes, plan.isDemo)
  const legs = buildLegExecutionInfo(plan)
  const builtTransactions = buildTransactions(plan)
  const zeroExRoute = hasZeroExRoute(quotes)
  const calldataReady = allZeroExCalldataAvailable(quotes, plan.isDemo)
  const zeroExLegs = quotes.filter((q) => q.provider === '0x')
  const exactAmountReady =
    !plan.isDemo &&
    zeroExLegs.length > 0 &&
    zeroExLegs.every((q) => q.execution?.hasExactSellAmount === true)
  const networkChainId = context.currentChainId ?? plan.chainId
  const networkSupported = isSupportedExecutionChain(networkChainId) && networkChainId === plan.chainId
  const slippageSet = plan.slippageBps > 0

  const checks: ExecutionReadiness['checks'] = [
    {
      id: 'wallet',
      label: 'Wallet connected',
      passed: context.walletConnected && Boolean(plan.walletAddress),
      detail: context.walletConnected ? plan.walletAddress : 'Connect wallet to execute',
    },
    {
      id: 'network',
      label: 'Network supported',
      passed: networkSupported,
      detail: networkSupported
        ? `Ethereum mainnet (chain ${plan.chainId})`
        : `Switch to Ethereum mainnet (chain ${plan.chainId})`,
    },
    {
      id: 'slippage',
      label: 'Slippage set',
      passed: slippageSet,
      detail: slippageSet ? `${plan.slippageBps} bps` : 'Set slippage tolerance',
    },
    {
      id: 'route',
      label: '0x route found',
      passed: zeroExRoute && !hasUnsupportedRoute(quotes),
      detail: hasUnsupportedRoute(quotes)
        ? 'Unsupported route'
        : zeroExRoute
          ? '0x aggregator route selected'
          : 'No 0x route in quote',
    },
    {
      id: 'calldata',
      label: 'Calldata present',
      passed: calldataReady,
      detail: calldataReady
        ? `${legs.filter((l) => l.calldataStatus === 'available').length}/${legs.length} legs ready`
        : '0x calldata missing or preview-only',
    },
    {
      id: 'exact_amount',
      label: 'Exact sell amount present',
      passed: exactAmountReady,
      detail: exactAmountReady
        ? 'Using 0x sellAmount (not USD estimate)'
        : 'Exact sellAmount unavailable — demo or fallback quote',
    },
    {
      id: 'approval',
      label: 'Approval requirement known',
      passed:
        !plan.isDemo &&
        zeroExLegs.every(
          (q) =>
            q.execution?.requiresApproval === false ||
            (q.execution?.requiresApproval === true && Boolean(q.execution.spender))
        ),
      detail: legs.some((l) => l.requiresApproval)
        ? `ERC-20 approval required — spender ${legs.find((l) => l.spender)?.spenderDisplay ?? 'unknown'}`
        : 'No ERC-20 approval required (native ETH) or not applicable',
    },
    {
      id: 'confirm',
      label: 'Execution disabled in Alpha',
      passed: false,
      detail: 'Live wallet signing is not enabled in this build',
    },
  ]

  return {
    status,
    statusLabel: getExecutionStatusLabel(status),
    checks,
    legs,
    builtTransactions,
    hasZeroExRoute: zeroExRoute,
    allCalldataAvailable: calldataReady,
    liveExecutionEnabled: false,
  }
}

export function buildExecutionPlan(
  preview: BasketQuotePreview,
  walletAddress?: string,
  context?: { walletConnected?: boolean; currentChainId?: number }
): ExecutionPlan {
  const legs: SwapLeg[] = preview.legs.map((leg, index) => ({
    quote: leg.bestQuote,
    index,
  }))

  const plan: ExecutionPlan = {
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

  plan.readiness = assessExecutionReadiness(plan, {
    walletConnected: context?.walletConnected ?? Boolean(walletAddress),
    currentChainId: context?.currentChainId ?? preview.chainId,
  })

  return plan
}

/** Converts execution plan into wallet-ready transactions (one per swap leg at MVP) */
export function buildTransactions(plan: ExecutionPlan): BuiltTransaction[] {
  return plan.legs.map((leg) => {
    const execution = leg.quote.execution
    const to = execution?.transactionTo ?? leg.quote.routerAddress
    const data = execution?.transactionData ?? leg.quote.calldata
    const value = execution?.transactionValue ?? '0'
    const gasEstimate = execution?.gas ?? leg.quote.estimatedGasUnits.toString()

    return {
      legIndex: leg.index,
      to,
      data,
      value,
      gasEstimate,
      chainId: plan.chainId,
      description: `${leg.quote.inputToken.symbol} → ${leg.quote.outputToken.symbol} via ${leg.quote.provider}`,
      provider: leg.quote.provider,
    }
  })
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
  const txHashes = plan.legs.map((_, i) => '0x' + i.toString(16).padStart(64, '0'))
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
