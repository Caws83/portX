import { PORTX_API_URL } from '@/config/constants'
import { apiClient, ApiError } from './client'
import { getTokenBySymbol } from '@/data/tokens'
import type { BasketQuotePreview, LegQuote, QuoteResponse } from '@/types/quote'
import type { QuoteProvider } from '@/types/route'
import type { Token } from '@/types/token'
import type { ExecutionPlan } from '@/types/execution'

/** Demo wallet when no wallet is connected — backend accepts optional address */
export const DEMO_QUOTE_WALLET = '0x0000000000000000000000000000000000000000'

export interface BuyBasketPreviewRequest {
  walletAddress?: string
  chainId: number
  inputToken: string
  inputAmountUsd: number
  basketId: string
  slippageBps: number
}

export interface BuyBasketLegQuote {
  provider: string
  fromToken: string
  toToken: string
  inputAmountUsd: number
  estimatedOutput: string
  estimatedGasUsd: number
  priceImpactPercent: number
  routeSummary: string
  calldata: string
  routerAddress: string
  allocationPercent: number
}

export interface BuyBasketPreviewResponse {
  mode: 'demo' | 'live'
  basketId?: string
  basketName: string
  inputAmountUsd: number
  totalOutputUsd?: number
  quotes: BuyBasketLegQuote[]
  totalEstimatedGasUsd: number
  warnings: string[]
}

/**
 * POST ${VITE_PORTX_API_URL}/quotes/buy-basket
 */
export async function previewBuyBasket(
  payload: BuyBasketPreviewRequest
): Promise<BuyBasketPreviewResponse> {
  if (!PORTX_API_URL) {
    throw new ApiError('VITE_PORTX_API_URL is not configured')
  }

  return apiClient<BuyBasketPreviewResponse>('/quotes/buy-basket', {
    method: 'POST',
    body: {
      walletAddress: payload.walletAddress ?? DEMO_QUOTE_WALLET,
      chainId: payload.chainId,
      inputToken: payload.inputToken,
      inputAmountUsd: payload.inputAmountUsd,
      basketId: payload.basketId,
      slippageBps: payload.slippageBps,
    },
  })
}

function normalizeProvider(provider: string): QuoteProvider {
  if (provider.startsWith('0x')) return '0x'
  if (provider.startsWith('1inch')) return '1inch'
  return 'uniswap'
}

function requireToken(symbol: string): Token {
  const token = getTokenBySymbol(symbol)
  if (!token) throw new ApiError(`Unknown token in quote response: ${symbol}`)
  return token
}

function legQuoteFromApi(leg: BuyBasketLegQuote, stablecoin: Token): LegQuote {
  const outputToken = requireToken(leg.toToken)
  const inputToken = leg.fromToken === stablecoin.symbol ? stablecoin : requireToken(leg.fromToken)
  const outputAmount = leg.estimatedOutput
  const outputAmountUsd = parseFloat(outputAmount) * outputToken.priceUsd

  const bestQuote: QuoteResponse = {
    provider: normalizeProvider(leg.provider),
    inputToken,
    outputToken,
    inputAmount: String(Math.round(leg.inputAmountUsd * Math.pow(10, inputToken.decimals))),
    inputAmountUsd: leg.inputAmountUsd,
    outputAmount,
    outputAmountUsd,
    estimatedGasUsd: leg.estimatedGasUsd,
    estimatedGasUnits: Math.round(leg.estimatedGasUsd * 1e9),
    priceImpactPercent: leg.priceImpactPercent,
    routeSummary: leg.routeSummary ? [leg.routeSummary] : [],
    calldata: leg.calldata,
    routerAddress: leg.routerAddress,
    warnings: [],
  }

  return {
    allocation: {
      token: outputToken,
      weightPercent: leg.allocationPercent,
      inputAmountUsd: leg.inputAmountUsd,
      inputAmount: bestQuote.inputAmount,
    },
    bestQuote,
    allQuotes: [bestQuote],
  }
}

/** Map backend buy-basket response into UI BasketQuotePreview */
export function mapBuyBasketResponseToPreview(
  response: BuyBasketPreviewResponse,
  chainId: number,
  slippageBps: number,
  inputTokenSymbol = 'USDC'
): BasketQuotePreview {
  const stablecoin = requireToken(inputTokenSymbol)
  const legs = response.quotes.map((q) => legQuoteFromApi(q, stablecoin))
  const totalOutputUsd =
    response.totalOutputUsd ??
    legs.reduce((sum, l) => sum + l.bestQuote.outputAmountUsd, 0)

  return {
    type: 'buy',
    basketId: response.basketId,
    basketName: response.basketName,
    totalInputUsd: response.inputAmountUsd,
    totalOutputUsd,
    totalGasUsd: response.totalEstimatedGasUsd,
    slippageBps,
    chainId,
    legs,
    warnings: response.warnings,
    isDemo: response.mode === 'demo',
    createdAt: Date.now(),
  }
}

export async function validateExecutionPlan(plan: ExecutionPlan): Promise<ExecutionPlan> {
  return apiClient<ExecutionPlan>('/api/v1/quotes/validate', {
    method: 'POST',
    body: plan,
  })
}
