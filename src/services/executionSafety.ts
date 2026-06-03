import type { ExecutionPlan } from '@/types/execution'
import { isSupportedExecutionChain } from '@/types/execution'
import {
  allZeroExCalldataAvailable,
  hasZeroExRoute,
} from '@/services/transactionBuilder'

/** User-facing reasons when live execution is blocked */
export const EXECUTION_BLOCKED_REASONS = {
  LIVE_EXECUTION_DISABLED: 'Live execution disabled',
  WALLET_NOT_CONNECTED: 'Wallet not connected',
  UNSUPPORTED_CHAIN: 'Unsupported chain',
  MISSING_CALLDATA: 'Missing calldata',
  INVALID_ROUTE: 'Invalid route',
} as const

export type ExecutionBlockedReason =
  (typeof EXECUTION_BLOCKED_REASONS)[keyof typeof EXECUTION_BLOCKED_REASONS]

/** Maximum slippage allowed for live execution prep */
export const MAX_EXECUTION_SLIPPAGE_BPS = 300

export interface ExecutionSafetyCheck {
  id: string
  label: string
  passed: boolean
  detail?: string
  blockedReason?: ExecutionBlockedReason
  weight: number
}

export interface ExecutionSafetyResult {
  /** Always BLOCKED in v1 — no transactions are sent */
  executionStatus: 'BLOCKED'
  executionLabel: 'BLOCKED'
  blockedReason: ExecutionBlockedReason
  /** True when all pre-flag checks pass */
  readyExceptFeatureFlag: boolean
  readinessScore: number
  checks: ExecutionSafetyCheck[]
  featureFlagEnabled: boolean
  /** Always false — safety layer never permits on-chain sends */
  canExecute: false
}

export interface ExecutionSafetyContext {
  walletConnected: boolean
  currentChainId?: number
  featureFlagEnabled: boolean
}

function isSlippageWithinLimits(slippageBps: number): boolean {
  return slippageBps > 0 && slippageBps <= MAX_EXECUTION_SLIPPAGE_BPS
}

function buildSafetyChecks(
  plan: ExecutionPlan,
  context: ExecutionSafetyContext
): ExecutionSafetyCheck[] {
  const quotes = plan.legs.map((l) => l.quote)
  const networkChainId = context.currentChainId ?? plan.chainId
  const chainSupported =
    isSupportedExecutionChain(networkChainId) && networkChainId === plan.chainId
  const zeroExRoute = !plan.isDemo && hasZeroExRoute(quotes)
  const calldataReady = !plan.isDemo && allZeroExCalldataAvailable(quotes, plan.isDemo)
  const walletOk = context.walletConnected && Boolean(plan.walletAddress)
  const slippageOk = isSlippageWithinLimits(plan.slippageBps)

  return [
    {
      id: 'wallet',
      label: 'Wallet connected',
      passed: walletOk,
      detail: walletOk ? plan.walletAddress : 'Connect wallet to execute',
      blockedReason: EXECUTION_BLOCKED_REASONS.WALLET_NOT_CONNECTED,
      weight: 20,
    },
    {
      id: 'network',
      label: 'Supported chain',
      passed: chainSupported,
      detail: chainSupported
        ? `Ethereum mainnet (chain ${plan.chainId})`
        : `Switch to Ethereum mainnet (chain ${plan.chainId})`,
      blockedReason: EXECUTION_BLOCKED_REASONS.UNSUPPORTED_CHAIN,
      weight: 20,
    },
    {
      id: 'route',
      label: '0x route found',
      passed: zeroExRoute,
      detail: zeroExRoute ? '0x aggregator route selected' : 'Quote must use 0x provider',
      blockedReason: EXECUTION_BLOCKED_REASONS.INVALID_ROUTE,
      weight: 20,
    },
    {
      id: 'calldata',
      label: 'Calldata available',
      passed: calldataReady,
      detail: calldataReady ? '0x transaction calldata present' : '0x calldata missing or invalid',
      blockedReason: EXECUTION_BLOCKED_REASONS.MISSING_CALLDATA,
      weight: 20,
    },
    {
      id: 'slippage',
      label: 'Slippage within limits',
      passed: slippageOk,
      detail: slippageOk
        ? `${plan.slippageBps} bps (max ${MAX_EXECUTION_SLIPPAGE_BPS})`
        : `Slippage must be 1–${MAX_EXECUTION_SLIPPAGE_BPS} bps`,
      blockedReason: EXECUTION_BLOCKED_REASONS.INVALID_ROUTE,
      weight: 20,
    },
    {
      id: 'featureFlag',
      label: 'Live execution enabled',
      passed: context.featureFlagEnabled,
      detail: context.featureFlagEnabled
        ? 'Feature flag on'
        : 'Set VITE_ENABLE_LIVE_EXECUTION=true to enable',
      blockedReason: EXECUTION_BLOCKED_REASONS.LIVE_EXECUTION_DISABLED,
      weight: 0,
    },
  ]
}

function computeReadinessScore(checks: ExecutionSafetyCheck[]): number {
  const scored = checks.filter((c) => c.weight > 0)
  const earned = scored.filter((c) => c.passed).reduce((sum, c) => sum + c.weight, 0)
  return earned
}

function resolveBlockedReason(
  checks: ExecutionSafetyCheck[],
  readyExceptFeatureFlag: boolean,
  featureFlagEnabled: boolean
): ExecutionBlockedReason {
  if (readyExceptFeatureFlag && !featureFlagEnabled) {
    return EXECUTION_BLOCKED_REASONS.LIVE_EXECUTION_DISABLED
  }

  const preFlagChecks = checks.filter((c) => c.id !== 'featureFlag')
  const firstFailed = preFlagChecks.find((c) => !c.passed)
  if (firstFailed?.blockedReason) return firstFailed.blockedReason

  if (!featureFlagEnabled) {
    return EXECUTION_BLOCKED_REASONS.LIVE_EXECUTION_DISABLED
  }

  return EXECUTION_BLOCKED_REASONS.LIVE_EXECUTION_DISABLED
}

/**
 * Evaluates whether a plan could execute live swaps.
 * Never returns canExecute: true — on-chain sends remain disabled in v1.
 */
export function assessExecutionSafety(
  plan: ExecutionPlan,
  context: ExecutionSafetyContext
): ExecutionSafetyResult {
  const checks = buildSafetyChecks(plan, context)
  const preFlagChecks = checks.filter((c) => c.id !== 'featureFlag')
  const readyExceptFeatureFlag = preFlagChecks.every((c) => c.passed)
  const readinessScore = computeReadinessScore(checks)
  const blockedReason = resolveBlockedReason(
    checks,
    readyExceptFeatureFlag,
    context.featureFlagEnabled
  )

  return {
    executionStatus: 'BLOCKED',
    executionLabel: 'BLOCKED',
    blockedReason,
    readyExceptFeatureFlag,
    readinessScore,
    checks,
    featureFlagEnabled: context.featureFlagEnabled,
    canExecute: false,
  }
}

/** Guard for future wallet send path — throws before any transaction API is invoked */
export function assertExecutionAllowed(safety: ExecutionSafetyResult): void {
  if (!safety.canExecute) {
    throw new Error(`Execution blocked: ${safety.blockedReason}`)
  }
}
