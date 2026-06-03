import type { Basket } from '@/types/basket'
import type { Token } from '@/types/token'
import type { HeldToken } from '@/types/portfolio'
import type { QuoteRequest, BasketQuotePreview, LegQuote, QuotePreviewType } from '@/types/quote'
import { ENABLE_DEMO_QUOTES } from '@/config/constants'
import { fetchSellAllQuoteFromBackend } from '@/api/portfolio'
import { ApiError } from '@/api/client'
import {
  calculateBasketBuyAllocations,
  calculateBasketSellAllocations,
  calculateSellAllAllocations,
} from './allocationEngine'
import { compareRoutesForLegs, totalGasUsd, aggregateWarnings } from './routeSelector'
import { getTokenBySymbol } from '@/data/tokens'

function getStablecoin(symbol = 'USDC'): Token {
  return getTokenBySymbol(symbol) ?? {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    priceUsd: 1,
    change24h: 0,
  }
}

function buildQuoteRequests(
  legs: ReturnType<typeof calculateBasketBuyAllocations>,
  stablecoin: Token,
  chainId: number,
  walletAddress: string | undefined,
  slippageBps: number,
  direction: 'buy' | 'sell'
): QuoteRequest[] {
  return legs.map((leg) => ({
    inputToken: direction === 'buy' ? stablecoin : leg.token,
    outputToken: direction === 'buy' ? leg.token : stablecoin,
    inputAmount: leg.inputAmount,
    inputAmountUsd: leg.inputAmountUsd,
    chainId,
    walletAddress,
    slippageBps,
  }))
}

async function buildPreviewFromLegs(
  type: QuotePreviewType,
  legs: ReturnType<typeof calculateBasketBuyAllocations>,
  requests: QuoteRequest[],
  meta: {
    basketId?: string
    basketName?: string
    slippageBps: number
    chainId: number
    isDemo: boolean
  }
): Promise<BasketQuotePreview> {
  const comparisons = await compareRoutesForLegs(requests)

  const legQuotes: LegQuote[] = comparisons.map((comp, i) => ({
    allocation: legs[i],
    bestQuote: comp.bestQuote,
    allQuotes: comp.quotes,
  }))

  const bestQuotes = legQuotes.map((l) => l.bestQuote)
  const totalInputUsd = legs.reduce((s, l) => s + l.inputAmountUsd, 0)
  const totalOutputUsd = bestQuotes.reduce((s, q) => s + q.outputAmountUsd, 0)

  const warnings = aggregateWarnings(bestQuotes)
  if (meta.isDemo) {
    warnings.unshift('Demo mode — quotes are simulated. Real API keys required for live routing.')
  }

  return {
    type,
    basketId: meta.basketId,
    basketName: meta.basketName,
    totalInputUsd,
    totalOutputUsd,
    totalGasUsd: totalGasUsd(bestQuotes),
    slippageBps: meta.slippageBps,
    chainId: meta.chainId,
    legs: legQuotes,
    warnings,
    isDemo: meta.isDemo,
    createdAt: Date.now(),
  }
}

export interface QuoteEngineParams {
  chainId: number
  walletAddress?: string
  slippageBps: number
  stablecoinSymbol?: string
}

/** Local demo quote engine — used when POST /quotes/buy-basket is unavailable */
export async function getLocalBuyBasketQuotePreview(
  basket: Basket,
  totalInputUsd: number,
  params: QuoteEngineParams
): Promise<BasketQuotePreview> {
  const inputToken = getStablecoin(params.stablecoinSymbol)
  const legs = calculateBasketBuyAllocations(basket, totalInputUsd, inputToken.decimals)
  const requests = buildQuoteRequests(
    legs,
    inputToken,
    params.chainId,
    params.walletAddress,
    params.slippageBps,
    'buy'
  )

  return buildPreviewFromLegs('buy', legs, requests, {
    basketId: basket.id,
    basketName: basket.name,
    slippageBps: params.slippageBps,
    chainId: params.chainId,
    isDemo: true,
  })
}

/** Buy basket: USDC → each allocation token (local providers; prefer useQuotePreview + API) */
export async function getBuyBasketQuotePreview(
  basket: Basket,
  totalInputUsd: number,
  params: QuoteEngineParams
): Promise<BasketQuotePreview> {
  return getLocalBuyBasketQuotePreview(basket, totalInputUsd, params)
}

/** Sell basket: each token → USDC */
export async function getSellBasketQuotePreview(
  basket: Basket,
  positionValueUsd: number,
  params: QuoteEngineParams
): Promise<BasketQuotePreview> {
  const outputToken = getStablecoin(params.stablecoinSymbol)
  const heldAmounts: Record<string, number> = {}
  for (const { token, weightPercent } of basket.allocations) {
    heldAmounts[token.symbol] = (positionValueUsd * weightPercent) / 100
  }

  const legs = calculateBasketSellAllocations(basket, heldAmounts, outputToken)
  const requests = buildQuoteRequests(
    legs,
    outputToken,
    params.chainId,
    params.walletAddress,
    params.slippageBps,
    'sell'
  )

  return buildPreviewFromLegs('sell_basket', legs, requests, {
    basketId: basket.id,
    basketName: basket.name,
    slippageBps: params.slippageBps,
    chainId: params.chainId,
    isDemo: ENABLE_DEMO_QUOTES,
  })
}

/** Local demo sell-all — used when POST /quotes/sell-all is unavailable */
export async function getLocalSellAllQuotePreview(
  holdings: HeldToken[],
  params: QuoteEngineParams
): Promise<BasketQuotePreview> {
  const outputToken = getStablecoin(params.stablecoinSymbol)
  const legs = calculateSellAllAllocations(holdings, outputToken)
  const requests = buildQuoteRequests(
    legs,
    outputToken,
    params.chainId,
    params.walletAddress,
    params.slippageBps,
    'sell'
  )

  return buildPreviewFromLegs('sell_all', legs, requests, {
    basketName: 'Full Portfolio',
    slippageBps: params.slippageBps,
    chainId: params.chainId,
    isDemo: true,
  })
}

/** Sell all portfolio: every held token → USDC (local providers; prefer useSellAllPreview + API) */
export async function getSellAllQuotePreview(
  holdings: HeldToken[],
  params: QuoteEngineParams
): Promise<BasketQuotePreview> {
  if (!ENABLE_DEMO_QUOTES) {
    try {
      return await fetchSellAllQuoteFromBackend({
        holdings,
        outputToken: getStablecoin(params.stablecoinSymbol),
        chainId: params.chainId,
        walletAddress: params.walletAddress,
        slippageBps: params.slippageBps,
      })
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }

  return getLocalSellAllQuotePreview(holdings, params)
}
