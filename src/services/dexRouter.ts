/**
 * Legacy DEX router — delegates to quoteEngine for backwards compatibility.
 * Prefer useQuotePreview + quoteEngine for new flows.
 */
import type { Basket } from '@/types/basket'
import type { Token } from '@/types/token'
import { getBuyBasketQuotePreview } from './quoteEngine'
import { executeDemoPlan, buildExecutionPlan } from './transactionBuilder'
import { mainnet } from 'wagmi/chains'

export type DexProvider = '0x' | '1inch' | 'uniswap'

export interface SwapQuote {
  provider: DexProvider
  sellToken: Token
  buyToken: Token
  sellAmount: string
  buyAmount: string
  estimatedGasUsd: number
  priceImpactPercent: number
  route: string[]
}

export interface BasketSwapRequest {
  allocations: { token: Token; weightPercent: number }[]
  totalUsd: number
  slippageBps: number
}

export async function getBasketSwapQuotes(
  request: BasketSwapRequest
): Promise<SwapQuote[]> {
  const basket: Basket = {
    id: 'legacy',
    name: 'Legacy',
    description: '',
    tag: '',
    allocations: request.allocations,
  }
  const preview = await getBuyBasketQuotePreview(basket, request.totalUsd, {
    chainId: mainnet.id,
    slippageBps: request.slippageBps,
  })
  return preview.legs.map((leg) => ({
    provider: leg.bestQuote.provider,
    sellToken: leg.bestQuote.inputToken,
    buyToken: leg.bestQuote.outputToken,
    sellAmount: leg.bestQuote.inputAmount,
    buyAmount: leg.bestQuote.outputAmount,
    estimatedGasUsd: leg.bestQuote.estimatedGasUsd,
    priceImpactPercent: leg.bestQuote.priceImpactPercent,
    route: leg.bestQuote.routeSummary,
  }))
}

export async function executeBasketBuy(_quotes: SwapQuote[]): Promise<{ txHash: string }> {
  const result = await executeDemoPlan(
    buildExecutionPlan({
      type: 'buy',
      totalInputUsd: 0,
      totalOutputUsd: 0,
      totalGasUsd: 0,
      slippageBps: 50,
      chainId: mainnet.id,
      legs: _quotes.map((q) => ({
        allocation: {
          token: q.buyToken,
          weightPercent: 0,
          inputAmountUsd: parseFloat(q.sellAmount),
          inputAmount: q.sellAmount,
        },
        bestQuote: {
          provider: q.provider,
          inputToken: q.sellToken,
          outputToken: q.buyToken,
          inputAmount: q.sellAmount,
          inputAmountUsd: parseFloat(q.sellAmount),
          outputAmount: q.buyAmount,
          outputAmountUsd: parseFloat(q.buyAmount) * q.buyToken.priceUsd,
          estimatedGasUsd: q.estimatedGasUsd,
          estimatedGasUnits: 180000,
          priceImpactPercent: q.priceImpactPercent,
          routeSummary: q.route,
          calldata: '0x0',
          routerAddress: '0x0',
          warnings: [],
        },
        allQuotes: [],
      })),
      warnings: [],
      isDemo: true,
      createdAt: Date.now(),
    })
  )
  return { txHash: result.txHashes[0] ?? '0x0' }
}

export async function executeBasketSell(_basketId: string): Promise<{ txHash: string }> {
  await new Promise((r) => setTimeout(r, 400))
  return { txHash: '0x' + '1'.repeat(64) }
}

export async function executeSellAll(): Promise<{ txHash: string }> {
  await new Promise((r) => setTimeout(r, 400))
  return { txHash: '0x' + '2'.repeat(64) }
}
