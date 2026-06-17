import type { ProviderQuote, QuoteRequest } from '../types/quote.js'
import { validateQuotePair } from '../config/supportedTokens.js'
import { getSwapQuote, isZeroExConfigured, quoteRequestToZeroEx } from './zeroEx.js'
import { getBestQuoteLocal } from './routeSelector.js'
import { emptyExecutionMetadata } from '../utils/executionMetadata.js'

export type QuotesSource = '0x' | 'fallback' | 'unsupported'

let lastQuotesSource: QuotesSource = 'fallback'

export function getQuotesStatus(): QuotesSource {
  return lastQuotesSource
}

const UNSUPPORTED_ROUTE_SUMMARY = 'Unsupported on Ethereum mainnet'
const UNSUPPORTED_WARNING = 'Token is not supported for Ethereum 0x routing yet.'

export function buildUnsupportedQuote(
  request: QuoteRequest,
  reason: string = UNSUPPORTED_WARNING
): ProviderQuote {
  return {
    provider: 'unsupported',
    fromToken: request.inputToken,
    toToken: request.outputToken,
    inputAmountUsd: request.inputAmountUsd,
    estimatedOutput: '0',
    estimatedGasUsd: 0,
    priceImpactPercent: 0,
    routeSummary: UNSUPPORTED_ROUTE_SUMMARY,
    calldata: null,
    routerAddress: null,
    warnings: [reason],
    ...emptyExecutionMetadata(request.chainId),
  }
}

function buildZeroXUnavailableQuote(request: QuoteRequest, reason: string): ProviderQuote {
  return {
    provider: '0x-demo',
    fromToken: request.inputToken,
    toToken: request.outputToken,
    inputAmountUsd: request.inputAmountUsd,
    estimatedOutput: '0',
    estimatedGasUsd: 0,
    priceImpactPercent: 0,
    routeSummary: `${request.inputToken} → ${request.outputToken} (0x unavailable)`,
    calldata: null,
    routerAddress: null,
    warnings: [reason],
    ...emptyExecutionMetadata(request.chainId),
  }
}

function isLiveZeroXQuote(quote: ProviderQuote): boolean {
  return (
    quote.provider === '0x' &&
    quote.hasExecutableCalldata === true &&
    quote.hasExactSellAmount === true
  )
}

/**
 * Best quote for one leg: unsupported marker, live 0x when configured, else local fallback.
 */
export async function getBestQuote(request: QuoteRequest): Promise<ProviderQuote> {
  const routeCheck = validateQuotePair(
    request.inputToken,
    request.outputToken,
    request.chainId
  )

  if (!routeCheck.supported) {
    lastQuotesSource = 'unsupported'
    return buildUnsupportedQuote(request, routeCheck.reason)
  }

  if (isZeroExConfigured()) {
    try {
      const quote = await getSwapQuote(quoteRequestToZeroEx(request))
      lastQuotesSource = '0x'
      return quote
    } catch (err) {
      const message = err instanceof Error ? err.message : '0x quote unavailable'
      console.warn('[PortX] 0x quote unavailable — returning non-executable leg.', err)
      lastQuotesSource = 'fallback'
      return buildZeroXUnavailableQuote(request, message)
    }
  }

  lastQuotesSource = 'fallback'
  return getBestQuoteLocal(request)
}

export { isLiveZeroXQuote }
