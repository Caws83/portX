import type { ProviderQuote, QuoteRequest } from '../types/quote.js'
import { getSwapQuote, isZeroExConfigured, quoteRequestToZeroEx } from './zeroEx.js'
import { getBestQuoteLocal } from './routeSelector.js'

export type QuotesSource = '0x' | 'fallback'

let lastQuotesSource: QuotesSource = 'fallback'

export function getQuotesStatus(): QuotesSource {
  return lastQuotesSource
}

/**
 * Best quote for one leg: live 0x when configured, else local demo providers (0x/1inch/uniswap-demo).
 */
export async function getBestQuote(request: QuoteRequest): Promise<ProviderQuote> {
  if (isZeroExConfigured()) {
    try {
      const quote = await getSwapQuote(quoteRequestToZeroEx(request))
      lastQuotesSource = '0x'
      return quote
    } catch (err) {
      console.warn('[PortX] 0x quote unavailable — using local quote fallback.', err)
    }
  }

  lastQuotesSource = 'fallback'
  return getBestQuoteLocal(request)
}
