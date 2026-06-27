import type { Token } from './token'
import type { QuoteProvider } from './route'
import type { QuoteExecutionMetadata } from '@/utils/executionMetadata'

export interface QuoteRequest {
  inputToken: Token
  outputToken: Token
  /** Smallest-unit amount string (demo uses USD-scaled placeholder) */
  inputAmount: string
  inputAmountUsd: number
  chainId: number
  walletAddress?: string
  slippageBps: number
}

export interface QuoteResponse {
  provider: QuoteProvider
  inputToken: Token
  outputToken: Token
  inputAmount: string
  inputAmountUsd: number
  outputAmount: string
  outputAmountUsd: number
  estimatedGasUsd: number
  estimatedGasUnits: number
  priceImpactPercent: number
  routeSummary: string[]
  /** Placeholder — populated by live 0x/1inch/Uniswap integration */
  calldata: string
  /** Placeholder — aggregator router contract address */
  routerAddress: string
  warnings: string[]
  expiresAt?: number
  /** Exact execution fields from 0x API — null for demo/fallback quotes */
  execution?: QuoteExecutionMetadata
  /** Sepolia testnet UI label — execution may fund via native ETH */
  testnetDisplayRoute?: {
    inputSymbol: string
    inputAmountDisplay: string
  }
  /** Sepolia Uniswap leg metadata for calldata regeneration */
  testnetSwap?: {
    tokenIn: string
    tokenOut: string
    poolFee?: number
    nativeEth: boolean
    /** Native ETH → WETH deposit leg (not Uniswap) */
    wethWrap?: boolean
  }
}

export interface AllocationLeg {
  token: Token
  weightPercent: number
  inputAmountUsd: number
  inputAmount: string
}

export interface LegQuote {
  allocation: AllocationLeg
  bestQuote: QuoteResponse
  allQuotes: QuoteResponse[]
}

export type QuotePreviewType = 'buy' | 'sell_basket' | 'sell_all'

export interface BasketQuotePreview {
  type: QuotePreviewType
  basketId?: string
  basketName?: string
  totalInputUsd: number
  totalOutputUsd: number
  totalGasUsd: number
  slippageBps: number
  chainId: number
  legs: LegQuote[]
  warnings: string[]
  isDemo: boolean
  createdAt: number
}
