import type { QuoteResponse } from './quote'
import type { QuotePreviewType } from './quote'

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
