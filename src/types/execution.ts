import type { QuoteResponse } from './quote'
import type { QuotePreviewType } from './quote'
import type { QuoteProvider } from './route'

export interface SwapLeg {
  quote: QuoteResponse
  index: number
}

export interface ExecutionPlan {
  id: string
  type: QuotePreviewType
  basketId?: string
  basketName?: string
  legs: SwapLeg[]
  totalInputUsd: number
  totalOutputUsd: number
  totalGasUsd: number
  slippageBps: number
  chainId: number
  walletAddress?: string
  isDemo: boolean
  warnings: string[]
  /** Populated by buildExecutionPlan — wallet execution prep (v1 preview only) */
  readiness?: ExecutionReadiness
}

/** Whether the quote includes executable 0x calldata or is preview-only */
export type ExecutionStatus = 'ready_for_wallet' | 'preview_only'

export type CalldataStatus = 'available' | 'missing' | 'demo'

export interface LegExecutionInfo {
  index: number
  provider: QuoteProvider
  inputSymbol: string
  outputSymbol: string
  routerAddress: string
  routerDisplay: string
  calldata: string
  calldataDisplay: string
  calldataStatus: CalldataStatus
}

export interface ExecutionReadinessCheck {
  id: string
  label: string
  passed: boolean
  detail?: string
}

export interface ExecutionReadiness {
  status: ExecutionStatus
  statusLabel: string
  checks: ExecutionReadinessCheck[]
  legs: LegExecutionInfo[]
  builtTransactions: BuiltTransaction[]
  hasZeroExRoute: boolean
  allCalldataAvailable: boolean
  /** Always false in v1 — real wallet sends are not enabled yet */
  liveExecutionEnabled: false
}

export interface LiveExecutionPlanSummary {
  status: ExecutionStatus
  statusLabel: string
  hasZeroExRoute: boolean
  allCalldataAvailable: boolean
  legs: LegExecutionInfo[]
}

/** Built transaction ready for wallet signing (one per swap leg at MVP stage) */
export interface BuiltTransaction {
  legIndex: number
  to: string
  data: string
  value: string
  gasEstimate: string
  chainId: number
  description: string
  provider: string
}

export interface ExecutionResult {
  success: boolean
  /** Demo tx hash placeholder — real hash from wagmi after on-chain send */
  txHashes: string[]
  message: string
}

/** Ethereum mainnet — only chain with live 0x execution prep in v1 */
export const SUPPORTED_EXECUTION_CHAIN_IDS = [1] as const

export function isSupportedExecutionChain(chainId: number): boolean {
  return (SUPPORTED_EXECUTION_CHAIN_IDS as readonly number[]).includes(chainId)
}
