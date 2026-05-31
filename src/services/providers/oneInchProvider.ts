import type { QuoteRequest, QuoteResponse } from '@/types/quote'
import { ROUTER_ADDRESSES } from '@/utils/addresses'

function simulateLatency(): Promise<void> {
  return new Promise((r) => setTimeout(r, 100 + Math.random() * 150))
}

/**
 * 1INCH QUOTE PROVIDER
 * Live: GET https://api.1inch.dev/swap/v5.2/{chainId}/quote
 * Secondary quote source — called via backend to protect API key.
 */
export async function fetchOneInchQuote(request: QuoteRequest): Promise<QuoteResponse> {
  // TODO: 1inch API quote call via PortX backend POST /api/v1/providers/1inch/quote
  await simulateLatency()

  const { inputToken, outputToken, inputAmountUsd } = request
  const outputAmount = (inputAmountUsd / outputToken.priceUsd * 0.999).toFixed(8)
  const gasUnits = 195_000

  return {
    provider: '1inch',
    inputToken,
    outputToken,
    inputAmount: request.inputAmount,
    inputAmountUsd: request.inputAmountUsd,
    outputAmount,
    outputAmountUsd: parseFloat(outputAmount) * outputToken.priceUsd,
    estimatedGasUsd: 4.2,
    estimatedGasUnits: gasUnits,
    priceImpactPercent: 0.15 + Math.random() * 0.2,
    routeSummary: [inputToken.symbol, outputToken.symbol],
    calldata: '0x' + '1inch'.padEnd(64, '0').slice(0, 64),
    routerAddress: ROUTER_ADDRESSES['1inch'],
    warnings: ['Demo quote — 1inch API key not configured'],
    expiresAt: Date.now() + 30_000,
  }
}

export async function fetchOneInchQuotes(requests: QuoteRequest[]): Promise<QuoteResponse[]> {
  return Promise.all(requests.map(fetchOneInchQuote))
}
