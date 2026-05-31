import type { QuoteRequest, QuoteResponse } from '@/types/quote'
import type { QuoteProvider } from '@/types/route'
import { ROUTER_ADDRESSES } from '@/utils/addresses'

const PROVIDER_JITTER: Record<QuoteProvider, number> = {
  '0x': 1.002,
  '1inch': 0.998,
  uniswap: 0.995,
}

const PROVIDER_GAS: Record<QuoteProvider, number> = {
  '0x': 180_000,
  '1inch': 195_000,
  uniswap: 210_000,
}

function simulateLatency(): Promise<void> {
  return new Promise((r) => setTimeout(r, 80 + Math.random() * 120))
}

function buildMockQuote(request: QuoteRequest, provider: QuoteProvider): QuoteResponse {
  const { inputToken, outputToken, inputAmountUsd } = request
  const jitter = PROVIDER_JITTER[provider]
  const rawOutput = inputAmountUsd / outputToken.priceUsd
  const outputAmount = (rawOutput * jitter).toFixed(8)
  const outputAmountUsd = parseFloat(outputAmount) * outputToken.priceUsd
  const gasUnits = PROVIDER_GAS[provider]
  const gasUsd = (gasUnits * 25) / 1e9 * 3450 // rough gwei→usd

  const warnings: string[] = []
  if (!import.meta.env.VITE_ZEROX_API_KEY) {
    warnings.push('Demo quote — 0x API key not configured')
  }

  return {
    provider,
    inputToken,
    outputToken,
    inputAmount: request.inputAmount,
    inputAmountUsd: request.inputAmountUsd,
    outputAmount,
    outputAmountUsd,
    estimatedGasUsd: gasUsd,
    estimatedGasUnits: gasUnits,
    priceImpactPercent: 0.08 + Math.random() * 0.25,
    routeSummary: [inputToken.symbol, 'WETH', outputToken.symbol],
    // 0x API quote call will populate real calldata
    calldata: '0x' + provider.padEnd(64, '0').slice(0, 64),
    routerAddress: ROUTER_ADDRESSES[provider],
    warnings: provider === '0x' ? warnings : [`Demo quote — ${provider} API not connected`],
    expiresAt: Date.now() + 30_000,
  }
}

/**
 * 0x QUOTE PROVIDER
 * Live: GET https://api.0x.org/swap/v1/quote
 * Requires VITE_PORTX_API_URL backend proxy — do not expose API key in frontend.
 */
export async function fetchZeroXQuote(request: QuoteRequest): Promise<QuoteResponse> {
  // TODO: 0x API quote call via PortX backend POST /api/v1/providers/0x/quote
  await simulateLatency()
  return buildMockQuote(request, '0x')
}

export async function fetchZeroXQuotes(requests: QuoteRequest[]): Promise<QuoteResponse[]> {
  return Promise.all(requests.map(fetchZeroXQuote))
}
