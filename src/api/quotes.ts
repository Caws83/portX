import { PORTX_API_URL } from '@/config/constants'
import { apiClient, ApiError } from './client'
import { getTokenBySymbol } from '@/data/tokens'
import type { BasketQuotePreview, LegQuote, QuoteResponse } from '@/types/quote'
import type { QuoteProvider } from '@/types/route'
import type { Token } from '@/types/token'
import type { ExecutionPlan } from '@/types/execution'
import {
  executionMetadataFromApiLeg,
  isLiveZeroXExecutionMetadata,
  parseGasUnits,
  usdDerivedInputAmount,
  type ApiLegExecutionFields,
} from '@/utils/executionMetadata'

/** Demo wallet when no wallet is connected — backend accepts optional address */
export const DEMO_QUOTE_WALLET = '0x0000000000000000000000000000000000000000'

export interface ApiLegQuote extends ApiLegExecutionFields {
  provider: string
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
  allocationPercent: number
}

export interface BuyBasketLegQuote extends ApiLegQuote {}

export interface BuyBasketPreviewRequest {
  walletAddress?: string
  chainId: number
  inputToken: string
  inputAmountUsd: number
  basketId: string
  slippageBps: number
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
  if (provider === 'unsupported') return 'unsupported'
  if (provider === 'uniswap-sepolia') return 'uniswap-sepolia'
  if (provider === '0x') return '0x'
  if (provider.startsWith('0x-')) return 'uniswap'
  if (provider.startsWith('1inch')) return '1inch'
  return 'uniswap'
}

function mapCalldata(calldata: string | null | undefined): string {
  return calldata ?? ''
}

function mapRouterAddress(router: string | null | undefined): string {
  return router ?? ''
}

function requireToken(symbol: string): Token {
  const token = getTokenBySymbol(symbol)
  if (!token) throw new ApiError(`Unknown token in quote response: ${symbol}`)
  return token
}

function mapApiLegToQuoteResponse(
  leg: ApiLegQuote,
  inputToken: Token,
  outputToken: Token,
  chainId: number
): QuoteResponse {
  const execution = executionMetadataFromApiLeg(leg, chainId)
  const isLiveLeg = leg.provider === '0x' && isLiveZeroXExecutionMetadata(execution)
  const inputAmount =
    execution.hasExactSellAmount && execution.sellAmount
      ? execution.sellAmount
      : usdDerivedInputAmount(leg.inputAmountUsd, inputToken.decimals)

  const calldata = execution.transactionData ?? mapCalldata(leg.calldata)
  const routerAddress = execution.transactionTo ?? mapRouterAddress(leg.routerAddress)

  return {
    provider: normalizeProvider(leg.provider),
    inputToken,
    outputToken,
    inputAmount,
    inputAmountUsd: leg.inputAmountUsd,
    outputAmount: leg.estimatedOutput,
    outputAmountUsd: parseFloat(leg.estimatedOutput) * outputToken.priceUsd,
    estimatedGasUsd: leg.estimatedGasUsd,
    estimatedGasUnits: parseGasUnits(execution.gas, leg.estimatedGasUsd),
    priceImpactPercent: leg.priceImpactPercent,
    routeSummary: leg.routeSummary ? [leg.routeSummary] : [],
    calldata,
    routerAddress,
    warnings: leg.warnings ?? [],
    execution: isLiveLeg ? execution : undefined,
  }
}

function legQuoteFromApi(leg: BuyBasketLegQuote, stablecoin: Token, chainId: number): LegQuote {
  const outputToken = requireToken(leg.toToken)
  const inputToken = leg.fromToken === stablecoin.symbol ? stablecoin : requireToken(leg.fromToken)
  const bestQuote = mapApiLegToQuoteResponse(leg, inputToken, outputToken, chainId)

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
  const legs = response.quotes.map((q) => legQuoteFromApi(q, stablecoin, chainId))
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

export interface SellAllPreviewRequest {
  walletAddress: string
  chainId: number
  outputToken: string
  slippageBps: number
}

export interface SellAllLegQuote extends ApiLegQuote {}

export interface SellAllPreviewResponse {
  mode: 'demo' | 'live'
  basketId?: string
  basketName?: string
  inputAmountUsd?: number
  totalOutputUsd?: number
  totalEstimatedOutputUsd?: number
  quotes: SellAllLegQuote[]
  totalEstimatedGasUsd: number
  warnings: string[]
}

/**
 * POST ${VITE_PORTX_API_URL}/quotes/sell-all
 */
export async function previewSellAll(
  payload: SellAllPreviewRequest
): Promise<SellAllPreviewResponse> {
  if (!PORTX_API_URL) {
    throw new ApiError('VITE_PORTX_API_URL is not configured')
  }

  return apiClient<SellAllPreviewResponse>('/quotes/sell-all', {
    method: 'POST',
    body: {
      walletAddress: payload.walletAddress,
      chainId: payload.chainId,
      outputToken: payload.outputToken,
      slippageBps: payload.slippageBps,
    },
  })
}

function sellLegQuoteFromApi(leg: SellAllLegQuote, outputToken: Token, chainId: number): LegQuote {
  const inputToken = requireToken(leg.fromToken)
  const bestQuote = mapApiLegToQuoteResponse(leg, inputToken, outputToken, chainId)
  const outputAmountUsd =
    outputToken.priceUsd > 0
      ? parseFloat(bestQuote.outputAmount) * outputToken.priceUsd
      : leg.inputAmountUsd
  bestQuote.outputAmountUsd = outputAmountUsd

  return {
    allocation: {
      token: inputToken,
      weightPercent: leg.allocationPercent,
      inputAmountUsd: leg.inputAmountUsd,
      inputAmount: bestQuote.inputAmount,
    },
    bestQuote,
    allQuotes: [bestQuote],
  }
}

export interface SellBasketPreviewRequest {
  walletAddress?: string
  chainId: number
  basketId: string
  outputToken: string
  slippageBps: number
  positionValueUsd?: number
}

export interface SellBasketLegQuote extends ApiLegQuote {}

export interface SellBasketPreviewResponse {
  mode: 'demo' | 'live'
  basketId?: string
  basketName: string
  inputAmountUsd: number
  totalOutputUsd?: number
  quotes: SellBasketLegQuote[]
  totalEstimatedGasUsd: number
  warnings: string[]
}

/**
 * POST ${VITE_PORTX_API_URL}/quotes/sell-basket
 */
export async function previewSellBasket(
  payload: SellBasketPreviewRequest
): Promise<SellBasketPreviewResponse> {
  if (!PORTX_API_URL) {
    throw new ApiError('VITE_PORTX_API_URL is not configured')
  }

  return apiClient<SellBasketPreviewResponse>('/quotes/sell-basket', {
    method: 'POST',
    body: {
      walletAddress: payload.walletAddress ?? DEMO_QUOTE_WALLET,
      chainId: payload.chainId,
      basketId: payload.basketId,
      outputToken: payload.outputToken,
      slippageBps: payload.slippageBps,
      positionValueUsd: payload.positionValueUsd,
    },
  })
}

/** Map backend sell-basket response into UI BasketQuotePreview */
export function mapSellBasketResponseToPreview(
  response: SellBasketPreviewResponse,
  chainId: number,
  slippageBps: number,
  outputTokenSymbol = 'USDC'
): BasketQuotePreview {
  const outputToken = requireToken(outputTokenSymbol)
  const legs = response.quotes.map((q) => sellLegQuoteFromApi(q, outputToken, chainId))
  const totalInputUsd =
    response.inputAmountUsd ?? legs.reduce((sum, l) => sum + l.allocation.inputAmountUsd, 0)
  const totalOutputUsd =
    response.totalOutputUsd ??
    legs.reduce((sum, l) => sum + l.bestQuote.outputAmountUsd, 0)

  return {
    type: 'sell_basket',
    basketId: response.basketId,
    basketName: response.basketName,
    totalInputUsd,
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

/** Map backend sell-all response into UI BasketQuotePreview */
export function mapSellAllResponseToPreview(
  response: SellAllPreviewResponse,
  chainId: number,
  slippageBps: number,
  outputTokenSymbol = 'USDC'
): BasketQuotePreview {
  const outputToken = requireToken(outputTokenSymbol)
  const legs = response.quotes.map((q) => sellLegQuoteFromApi(q, outputToken, chainId))
  const totalInputUsd =
    response.inputAmountUsd ?? legs.reduce((sum, l) => sum + l.allocation.inputAmountUsd, 0)
  const totalOutputUsd =
    response.totalEstimatedOutputUsd ??
    response.totalOutputUsd ??
    legs.reduce((sum, l) => sum + l.bestQuote.outputAmountUsd, 0)

  return {
    type: 'sell_all',
    basketName: response.basketName ?? 'Full Portfolio',
    totalInputUsd,
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
