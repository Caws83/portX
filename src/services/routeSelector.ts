import type { QuoteRequest, QuoteResponse } from '@/types/quote'
import type { RouteComparison } from '@/types/route'
import { fetchZeroXQuote } from './providers/zeroXProvider'
import { fetchOneInchQuote } from './providers/oneInchProvider'
import { fetchUniswapQuote } from './providers/uniswapProvider'

/**
 * Fetches quotes from all providers in parallel and selects the best route.
 * Best = highest output amount (MVP heuristic; production adds gas-adjusted scoring).
 */
export async function compareRoutes(request: QuoteRequest): Promise<RouteComparison> {
  const [zeroX, oneInch, uniswap] = await Promise.all([
    fetchZeroXQuote(request),
    fetchOneInchQuote(request),
    fetchUniswapQuote(request),
  ])

  const quotes = [zeroX, oneInch, uniswap]
  const bestQuote = selectBestQuote(quotes)

  return {
    request,
    quotes,
    bestQuote,
    selectedProvider: bestQuote.provider,
  }
}

export async function compareRoutesForLegs(
  requests: QuoteRequest[]
): Promise<RouteComparison[]> {
  return Promise.all(requests.map(compareRoutes))
}

export function selectBestQuote(quotes: QuoteResponse[]): QuoteResponse {
  return quotes.reduce((best, current) =>
    current.outputAmountUsd > best.outputAmountUsd ? current : best
  )
}

export function totalGasUsd(quotes: QuoteResponse[]): number {
  return quotes.reduce((sum, q) => sum + q.estimatedGasUsd, 0)
}

export function aggregateWarnings(quotes: QuoteResponse[]): string[] {
  const seen = new Set<string>()
  const warnings: string[] = []
  for (const q of quotes) {
    for (const w of q.warnings) {
      if (!seen.has(w)) {
        seen.add(w)
        warnings.push(w)
      }
    }
  }
  return warnings
}
