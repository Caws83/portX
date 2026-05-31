import type { ProviderQuote, QuoteRequest } from '../../types/quote.js'
import { getToken } from '../../data/tokens.js'

const ROUTER = '0xdef1c0ded9bec7b1d5460550f41f0a0e1e2e3e4e'

/**
 * 0x SWAP API — future integration:
 * GET https://api.0x.org/swap/v1/quote
 * Headers: 0x-api-key from env.ZEROX_API_KEY
 */
export async function fetchZeroXQuote(request: QuoteRequest): Promise<ProviderQuote> {
  const out = getToken(request.outputToken)!
  const jitter = 1.002
  const estimatedOutput = (request.inputAmountUsd / out.priceUsd * jitter).toFixed(6)

  return {
    provider: '0x-demo',
    fromToken: request.inputToken,
    toToken: request.outputToken,
    inputAmountUsd: request.inputAmountUsd,
    estimatedOutput,
    estimatedGasUsd: 3.25,
    priceImpactPercent: 0.1 + Math.random() * 0.15,
    routeSummary: `${request.inputToken} → ${request.outputToken}`,
    calldata: '0x_DEMO_CALLDATA_0X',
    routerAddress: ROUTER,
  }
}
