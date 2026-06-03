import { DEMO_TOKENS } from '../data/tokens.js'
import type { Token } from '../types/token.js'

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price'
const CACHE_TTL_MS = 60_000

/** PortX symbols → CoinGecko coin ids */
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  FET: 'fetch-ai',
  RNDR: 'render-token',
  TAO: 'bittensor',
  NEAR: 'near',
  DOGE: 'dogecoin',
  PEPE: 'pepe',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
}

const TRACKED_SYMBOLS = Object.keys(SYMBOL_TO_COINGECKO_ID)

export type PricingSource = 'coingecko' | 'fallback'

export interface TokenPriceQuote {
  priceUsd: number
  change24h: number
}

interface PriceCache {
  prices: Record<string, TokenPriceQuote>
  fetchedAt: number
}

let cache: PriceCache | null = null
let pricingSource: PricingSource = 'fallback'

function staticPrices(): Record<string, TokenPriceQuote> {
  const out: Record<string, TokenPriceQuote> = {}
  for (const token of DEMO_TOKENS) {
    out[token.symbol] = { priceUsd: token.priceUsd, change24h: token.change24h }
  }
  return out
}

function parseCoinGeckoResponse(
  body: Record<string, { usd?: number; usd_24h_change?: number }>
): Record<string, TokenPriceQuote> {
  const prices: Record<string, TokenPriceQuote> = {}

  for (const symbol of TRACKED_SYMBOLS) {
    const id = SYMBOL_TO_COINGECKO_ID[symbol]
    const row = body[id]
    if (row?.usd == null || Number.isNaN(row.usd)) continue
    prices[symbol] = {
      priceUsd: row.usd,
      change24h: row.usd_24h_change ?? 0,
    }
  }

  return prices
}

async function fetchFromCoinGecko(): Promise<Record<string, TokenPriceQuote>> {
  const ids = [...new Set(Object.values(SYMBOL_TO_COINGECKO_ID))].join(',')
  const url = `${COINGECKO_API}?ids=${ids}&vs_currencies=usd&include_24hr_change=true`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`CoinGecko HTTP ${response.status}: ${response.statusText}`)
  }

  const body = (await response.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number }
  >

  const prices = parseCoinGeckoResponse(body)
  if (Object.keys(prices).length === 0) {
    throw new Error('CoinGecko returned no usable prices')
  }

  return prices
}

/**
 * Fetch live USD prices for tracked symbols (60s cache).
 * Falls back to static DEMO_TOKENS prices when CoinGecko is unavailable.
 */
export async function getTokenPrices(): Promise<Record<string, TokenPriceQuote>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.prices
  }

  try {
    const live = await fetchFromCoinGecko()
    const merged = { ...staticPrices(), ...live }
    cache = { prices: merged, fetchedAt: Date.now() }
    pricingSource = 'coingecko'
    return merged
  } catch (err) {
    console.warn('[PortX] CoinGecko unavailable — using static token price fallback.', err)
    const fallback = staticPrices()
    cache = { prices: fallback, fetchedAt: Date.now() }
    pricingSource = 'fallback'
    return fallback
  }
}

/** Tokens list for GET /tokens — same shape as DEMO_TOKENS with live prices applied */
export async function getTokensWithLivePrices(): Promise<Token[]> {
  const prices = await getTokenPrices()
  return DEMO_TOKENS.map((token) => {
    const quote = prices[token.symbol]
    if (!quote) return token
    return {
      ...token,
      priceUsd: quote.priceUsd,
      change24h: quote.change24h,
    }
  })
}

export function getPricingStatus(): {
  pricing: PricingSource
  cacheAge: number | null
} {
  if (!cache) {
    return { pricing: pricingSource, cacheAge: null }
  }
  return {
    pricing: pricingSource,
    cacheAge: Math.max(0, Date.now() - cache.fetchedAt),
  }
}
