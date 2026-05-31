import type { ProviderQuote, QuoteRequest } from '../../types/quote.js'
import { getToken } from '../../data/tokens.js'

const ROUTER = '0x111111125421ca6dc452d289314280a0f8842a65'

/**
 * 1INCH API — future integration:
 * GET https://api.1inch.dev/swap/v5.2/{chainId}/quote
 * Headers: Authorization: Bearer env.ONEINCH_API_KEY
 */
export async function fetchOneInchQuote(request: QuoteRequest): Promise<ProviderQuote> {
  const out = getToken(request.outputToken)!
  const estimatedOutput = (request.inputAmountUsd / out.priceUsd * 0.998).toFixed(6)

  return {
    provider: '1inch-demo',
    fromToken: request.inputToken,
    toToken: request.outputToken,
    inputAmountUsd: request.inputAmountUsd,
    estimatedOutput,
    estimatedGasUsd: 3.8,
    priceImpactPercent: 0.15 + Math.random() * 0.2,
    routeSummary: `${request.inputToken} → ${request.outputToken}`,
    calldata: '0x_DEMO_CALLDATA_1INCH',
    routerAddress: ROUTER,
  }
}
