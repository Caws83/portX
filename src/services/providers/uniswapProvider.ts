import type { QuoteRequest, QuoteResponse } from '@/types/quote'
import { ROUTER_ADDRESSES } from '@/utils/addresses'

function simulateLatency(): Promise<void> {
  return new Promise((r) => setTimeout(r, 120 + Math.random() * 180))
}

/**
 * UNISWAP QUOTE PROVIDER
 * Live: Uniswap SDK V3 Quoter or Universal Router simulation
 * Fallback / direct route when aggregators lack liquidity.
 */
export async function fetchUniswapQuote(request: QuoteRequest): Promise<QuoteResponse> {
  // TODO: Uniswap SDK quote call — QuoterV2.quoteExactInputSingle or Universal Router
  await simulateLatency()

  const { inputToken, outputToken, inputAmountUsd } = request
  const outputAmount = (inputAmountUsd / outputToken.priceUsd * 0.992).toFixed(8)
  const gasUnits = 220_000

  return {
    provider: 'uniswap',
    inputToken,
    outputToken,
    inputAmount: request.inputAmount,
    inputAmountUsd: request.inputAmountUsd,
    outputAmount,
    outputAmountUsd: parseFloat(outputAmount) * outputToken.priceUsd,
    estimatedGasUsd: 5.1,
    estimatedGasUnits: gasUnits,
    priceImpactPercent: 0.2 + Math.random() * 0.35,
    routeSummary: [inputToken.symbol, 'WETH', outputToken.symbol, '(V3 0.3%)'],
    calldata: '0x' + 'uni'.padEnd(64, '0').slice(0, 64),
    routerAddress: ROUTER_ADDRESSES.uniswap,
    warnings: ['Demo quote — Uniswap SDK not connected'],
    expiresAt: Date.now() + 30_000,
  }
}

export async function fetchUniswapQuotes(requests: QuoteRequest[]): Promise<QuoteResponse[]> {
  return Promise.all(requests.map(fetchUniswapQuote))
}
