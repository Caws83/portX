export type QuoteProviderId = '0x' | '1inch' | 'uniswap' | '0x-demo' | '1inch-demo' | 'uniswap-demo'

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
  calldata: string
  routerAddress: string
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
