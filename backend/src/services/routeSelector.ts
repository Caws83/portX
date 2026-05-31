import type { ProviderQuote } from '../types/quote.js'
import { fetchZeroXQuote } from './providers/zeroXProvider.js'
import { fetchOneInchQuote } from './providers/oneInchProvider.js'
import { fetchUniswapQuote } from './providers/uniswapProvider.js'
import type { QuoteRequest } from '../types/quote.js'

export async function fetchAllProviderQuotes(request: QuoteRequest): Promise<ProviderQuote[]> {
  return Promise.all([
    fetchZeroXQuote(request),
    fetchOneInchQuote(request),
    fetchUniswapQuote(request),
  ])
}

/** Best = highest estimated output; tie-break = lowest gas */
export function selectBestQuote(quotes: ProviderQuote[]): ProviderQuote {
  return quotes.reduce((best, q) => {
    const bestOut = parseFloat(best.estimatedOutput)
    const qOut = parseFloat(q.estimatedOutput)
    if (qOut > bestOut) return q
    if (qOut === bestOut && q.estimatedGasUsd < best.estimatedGasUsd) return q
    return best
  })
}

export async function getBestQuote(request: QuoteRequest): Promise<ProviderQuote> {
  const quotes = await fetchAllProviderQuotes(request)
  return selectBestQuote(quotes)
}
