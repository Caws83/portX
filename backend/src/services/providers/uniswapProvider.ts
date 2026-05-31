import type { ProviderQuote, QuoteRequest } from '../../types/quote.js'
import { getToken } from '../../data/tokens.js'

const ROUTER = '0x3fc91a3afd7039651d5938a7e06bd7b3d3222b5f'

/**
 * UNISWAP SDK / AlphaRouter — future integration:
 * @uniswap/smart-order-router Quoter or Universal Router simulation
 */
export async function fetchUniswapQuote(request: QuoteRequest): Promise<ProviderQuote> {
  const out = getToken(request.outputToken)!
  const estimatedOutput = (request.inputAmountUsd / out.priceUsd * 0.992).toFixed(6)

  return {
    provider: 'uniswap-demo',
    fromToken: request.inputToken,
    toToken: request.outputToken,
    inputAmountUsd: request.inputAmountUsd,
    estimatedOutput,
    estimatedGasUsd: 4.1,
    priceImpactPercent: 0.2 + Math.random() * 0.25,
    routeSummary: `${request.inputToken} → WETH → ${request.outputToken}`,
    calldata: '0x_DEMO_CALLDATA_UNI',
    routerAddress: ROUTER,
  }
}
