export type QuoteProviderId =
  | '0x'
  | '1inch'
  | 'uniswap'
  | 'unsupported'
  | '0x-demo'
  | '1inch-demo'
  | 'uniswap-demo'

export interface QuoteRequest {
  inputToken: string
  outputToken: string
  inputAmountUsd: number
  chainId: number
  walletAddress?: string
  slippageBps: number
}

export interface ProviderQuote {
  provider: QuoteProviderId
  fromToken: string
  toToken: string
  inputAmountUsd: number
  estimatedOutput: string
  estimatedGasUsd: number
  priceImpactPercent: number
  routeSummary: string
  calldata: string | null
  routerAddress: string | null
  warnings?: string[]
  /** Exact sell amount in token base units (from 0x API) */
  sellAmount?: string | null
  /** Exact buy amount in token base units (from 0x API) */
  buyAmount?: string | null
  /** AllowanceHolder / Permit2 spender for ERC-20 approvals */
  spender?: string | null
  transactionTo?: string | null
  transactionData?: string | null
  transactionValue?: string | null
  gas?: string | null
  gasPrice?: string | null
  tokenIn?: string | null
  tokenOut?: string | null
  chainId?: number | null
  hasExecutableCalldata?: boolean
  hasExactSellAmount?: boolean
  requiresApproval?: boolean
}

export interface LegQuoteResponse extends ProviderQuote {
  allocationPercent: number
}

export interface BasketQuoteResponse {
  mode: 'demo' | 'live'
  basketId?: string
  basketName?: string
  inputAmountUsd: number
  totalOutputUsd?: number
  quotes: LegQuoteResponse[]
  totalEstimatedGasUsd: number
  warnings: string[]
}
