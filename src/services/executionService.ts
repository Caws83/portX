import { ENABLE_LIVE_EXECUTION } from '@/config/features'
import type { BuiltTransaction, ExecutionPlan, ExecutionResult } from '@/types/execution'
import { isSupportedExecutionChain } from '@/types/execution'
import type { QuoteProvider } from '@/types/route'
import type { ExecutionSafetyResult } from '@/services/executionSafety'
import { assertExecutionAllowed } from '@/services/executionSafety'
import {
  buildTransactions,
  isValidCalldata,
  isValidRouterAddress,
  truncateAddress,
} from '@/services/transactionBuilder'

export const LIVE_EXECUTION_DISABLED_ERROR = 'Live execution disabled'

export interface PreparedLegExecution {
  legIndex: number
  chainId: number
  provider: QuoteProvider
  routerAddress: string
  routerDisplay: string
  targetAddress: string
  calldata: string
  calldataSize: number
  estimatedGasUnits: number
  estimatedGasUsd: number
  inputSymbol: string
  outputSymbol: string
  expiresAt?: number
}

export interface PreparedExecution {
  planId: string
  chainId: number
  walletAddress?: string
  legs: PreparedLegExecution[]
  transactions: BuiltTransaction[]
}

export type SimulationStatus = 'idle' | 'passed' | 'failed'

export interface SimulationLegResult {
  legIndex: number
  passed: boolean
  checks: {
    calldataPresent: boolean
    routerPresent: boolean
    supportedChain: boolean
    quoteNotExpired: boolean
  }
  failures: string[]
}

export interface SimulationResult {
  status: SimulationStatus
  passed: boolean
  label: 'Simulation Passed' | 'Simulation Failed' | 'Not simulated'
  legs: SimulationLegResult[]
  message: string
  simulatedAt: number
}

export interface SimulateExecutionContext {
  currentChainId?: number
}

function isQuoteNotExpired(expiresAt?: number): boolean {
  if (expiresAt == null) return true
  return expiresAt > Date.now()
}

function legFromTransaction(plan: ExecutionPlan, tx: BuiltTransaction): PreparedLegExecution {
  const leg = plan.legs.find((l) => l.index === tx.legIndex)!
  const quote = leg.quote
  return {
    legIndex: tx.legIndex,
    chainId: tx.chainId,
    provider: quote.provider,
    routerAddress: tx.to,
    routerDisplay: truncateAddress(tx.to),
    targetAddress: tx.to,
    calldata: tx.data,
    calldataSize: tx.data.length,
    estimatedGasUnits: quote.estimatedGasUnits,
    estimatedGasUsd: quote.estimatedGasUsd,
    inputSymbol: quote.inputToken.symbol,
    outputSymbol: quote.outputToken.symbol,
    expiresAt: quote.expiresAt,
  }
}

/**
 * Quote → safety → prepare wallet-ready payloads (no chain calls).
 */
export function prepareExecution(
  plan: ExecutionPlan,
  _safety?: ExecutionSafetyResult
): PreparedExecution {
  const transactions = buildTransactions(plan)
  return {
    planId: plan.id,
    chainId: plan.chainId,
    walletAddress: plan.walletAddress,
    legs: transactions.map((tx) => legFromTransaction(plan, tx)),
    transactions,
  }
}

function validateLegForSimulation(
  leg: PreparedLegExecution,
  context?: SimulateExecutionContext
): SimulationLegResult {
  const chainId = context?.currentChainId ?? leg.chainId
  const calldataPresent = isValidCalldata(leg.calldata)
  const routerPresent = isValidRouterAddress(leg.targetAddress)
  const supportedChain =
    isSupportedExecutionChain(leg.chainId) &&
    isSupportedExecutionChain(chainId) &&
    chainId === leg.chainId
  const quoteNotExpired = isQuoteNotExpired(leg.expiresAt)

  const checks = { calldataPresent, routerPresent, supportedChain, quoteNotExpired }
  const failures: string[] = []
  if (!calldataPresent) failures.push('Missing or invalid calldata')
  if (!routerPresent) failures.push('Missing or invalid router address')
  if (!supportedChain) failures.push('Unsupported chain')
  if (!quoteNotExpired) failures.push('Quote expired')

  return {
    legIndex: leg.legIndex,
    passed: failures.length === 0,
    checks,
    failures,
  }
}

/**
 * Dry-run validation only — no wallet popup, no RPC, no contract calls.
 */
export async function simulateExecution(
  prepared: PreparedExecution,
  context?: SimulateExecutionContext
): Promise<SimulationResult> {
  await new Promise((r) => setTimeout(r, 120))

  const legs = prepared.legs.map((leg) => validateLegForSimulation(leg, context))
  const passed = legs.every((l) => l.passed)
  const failedLegs = legs.filter((l) => !l.passed)

  return {
    status: passed ? 'passed' : 'failed',
    passed,
    label: passed ? 'Simulation Passed' : 'Simulation Failed',
    legs,
    message: passed
      ? `All ${legs.length} leg(s) validated for execution prep.`
      : `Simulation failed on leg(s): ${failedLegs.map((l) => l.legIndex + 1).join(', ')}.`,
    simulatedAt: Date.now(),
  }
}

/**
 * Live execution entry point — blocked unless ENABLE_LIVE_EXECUTION is true.
 * Never invokes sendTransaction / writeContract in this build.
 */
export async function executeTransaction(
  prepared: PreparedExecution,
  safety: ExecutionSafetyResult
): Promise<ExecutionResult> {
  if (!ENABLE_LIVE_EXECUTION) {
    throw new Error(LIVE_EXECUTION_DISABLED_ERROR)
  }

  assertExecutionAllowed(safety)

  // Future: walletClient.sendTransaction({ to, data, value, chainId }) per leg
  void prepared
  throw new Error('Live execution path not enabled in this build')
}
