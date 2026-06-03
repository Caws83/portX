import type { BasketQuoteResponse, LegQuoteResponse } from '../types/quote.js'
import { requireBasket } from '../data/demoBaskets.js'
import { getDemoPortfolio } from '../data/demoPortfolio.js'
import { calculateBuyLegs, calculateSellLegs, calculateSellAllLegs } from './allocationEngine.js'
import { getBestQuote, getQuotesStatus } from './quoteProviders.js'
import { sum } from '../utils/math.js'

const DEMO_WARNINGS = [
  'Demo quote only. No real swap will execute.',
  'PortX is non-custodial — user signs transactions from their wallet when live.',
]

const LIVE_WARNINGS = [
  'Quote from 0x Swap API — preview only, no swap will execute.',
  'PortX is non-custodial — user signs transactions from their wallet when live.',
]

async function quoteLegs(
  legs: ReturnType<typeof calculateBuyLegs>,
  inputToken: string,
  outputToken: string,
  chainId: number,
  walletAddress: string | undefined,
  slippageBps: number,
  direction: 'buy' | 'sell'
): Promise<LegQuoteResponse[]> {
  const quotes: LegQuoteResponse[] = []

  for (const leg of legs) {
    const from = direction === 'buy' ? inputToken : leg.symbol
    const to = direction === 'buy' ? leg.symbol : outputToken

    const best = await getBestQuote({
      inputToken: from,
      outputToken: to,
      inputAmountUsd: leg.inputAmountUsd,
      chainId,
      walletAddress,
      slippageBps,
    })

    quotes.push({
      ...best,
      allocationPercent: leg.weightPercent,
    })
  }

  return quotes
}

export async function buyBasketQuote(params: {
  walletAddress?: string
  chainId: number
  inputToken: string
  inputAmountUsd: number
  basketId: string
  slippageBps: number
}): Promise<BasketQuoteResponse> {
  const basket = requireBasket(params.basketId)
  const legs = calculateBuyLegs(basket, params.inputAmountUsd)
  const quotes = await quoteLegs(
    legs,
    params.inputToken,
    params.inputToken,
    params.chainId,
    params.walletAddress,
    params.slippageBps,
    'buy'
  )

  return buildResponse(basket.id, basket.name, params.inputAmountUsd, quotes)
}

export async function sellBasketQuote(params: {
  walletAddress?: string
  chainId: number
  basketId: string
  outputToken: string
  slippageBps: number
  positionValueUsd?: number
}): Promise<BasketQuoteResponse> {
  const basket = requireBasket(params.basketId)
  const portfolio = params.walletAddress
    ? getDemoPortfolio(params.walletAddress)
    : null
  const positionUsd =
    params.positionValueUsd ??
    (portfolio?.activeBasketIds.includes(basket.id) ? 2500 : basket.totalValueUsd ?? 1000)

  const legs = calculateSellLegs(basket, positionUsd)
  const quotes = await quoteLegs(
    legs,
    params.outputToken,
    params.outputToken,
    params.chainId,
    params.walletAddress,
    params.slippageBps,
    'sell'
  )

  return buildResponse(basket.id, basket.name, positionUsd, quotes)
}

export async function sellAllQuote(params: {
  walletAddress: string
  chainId: number
  outputToken: string
  slippageBps: number
}): Promise<BasketQuoteResponse> {
  const portfolio = getDemoPortfolio(params.walletAddress)
  const legs = calculateSellAllLegs(
    portfolio.heldTokens.map((h) => ({ symbol: h.token.symbol, valueUsd: h.valueUsd }))
  )

  const quotes = await quoteLegs(
    legs,
    params.outputToken,
    params.outputToken,
    params.chainId,
    params.walletAddress,
    params.slippageBps,
    'sell'
  )

  return buildResponse(undefined, 'Full Portfolio', portfolio.totalValueUsd, quotes)
}

function buildResponse(
  basketId: string | undefined,
  basketName: string,
  inputAmountUsd: number,
  quotes: LegQuoteResponse[]
): BasketQuoteResponse {
  const totalGas = sum(quotes.map((q) => q.estimatedGasUsd))
  const totalOutputUsd = quotes.reduce((s, q) => {
    const out = parseFloat(q.estimatedOutput)
    return s + (Number.isNaN(out) ? 0 : out)
  }, 0)

  const quotesSource = getQuotesStatus()
  const isLive = quotesSource === '0x'

  return {
    mode: isLive ? 'live' : 'demo',
    basketId,
    basketName,
    inputAmountUsd,
    totalOutputUsd,
    quotes,
    totalEstimatedGasUsd: Math.round(totalGas * 100) / 100,
    warnings: isLive ? [...LIVE_WARNINGS] : [...DEMO_WARNINGS],
  }
}
