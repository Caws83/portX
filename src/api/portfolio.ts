import { PORTX_API_URL } from '@/config/constants'
import { apiClient, ApiError } from './client'
import type { BasketQuotePreview } from '@/types/quote'
import type { Token } from '@/types/token'
import type { HeldToken } from '@/types/portfolio'
import { DEMO_QUOTE_WALLET } from '@/api/quotes'

export interface PortfolioSellRequest {
  holdings: { token: Token; balance: number; valueUsd: number }[]
  outputToken: Token
  chainId: number
  walletAddress?: string
  slippageBps: number
}

export interface PortfolioPosition {
  symbol: string
  name?: string
  balance?: number
  valueUsd: number
  allocationPercent?: number
}

/** Backend demo portfolio payload (inside GET /portfolio/demo/:wallet) */
export interface DemoPortfolioPayload {
  walletAddress: string
  totalValueUsd: number
  costBasisUsd: number
  change24hPercent: number
  heldTokens: HeldToken[]
  activeBasketIds: string[]
}

export interface PortfolioDemoApiResponse {
  mode: 'demo' | 'live'
  portfolio: DemoPortfolioPayload
}

/** Normalized portfolio view for dashboard (supports documented + backend shapes) */
export interface PortfolioView {
  walletAddress: string
  totalValueUsd: number
  costBasisUsd: number
  profitLossPercent: number
  change24hPercent: number
  heldTokens: HeldToken[]
  activeBasketIds: string[]
  positions: PortfolioPosition[]
}

/**
 * GET ${VITE_PORTX_API_URL}/portfolio/demo/:walletAddress
 */
export async function fetchPortfolio(
  walletAddress: string = DEMO_QUOTE_WALLET
): Promise<PortfolioView> {
  if (!PORTX_API_URL) {
    throw new ApiError('VITE_PORTX_API_URL is not configured')
  }

  const normalized = walletAddress.toLowerCase()
  const data = await apiClient<PortfolioDemoApiResponse>(
    `/portfolio/demo/${normalized}`
  )

  return mapPortfolioResponse(data)
}

export function mapPortfolioResponse(
  response: PortfolioDemoApiResponse | Record<string, unknown>
): PortfolioView {
  if ('portfolio' in response && response.portfolio) {
    const p = response.portfolio as DemoPortfolioPayload
    const profitLossPercent =
      p.costBasisUsd > 0
        ? ((p.totalValueUsd - p.costBasisUsd) / p.costBasisUsd) * 100
        : 0
    return {
      walletAddress: p.walletAddress,
      totalValueUsd: p.totalValueUsd,
      costBasisUsd: p.costBasisUsd,
      profitLossPercent,
      change24hPercent: p.change24hPercent,
      heldTokens: p.heldTokens,
      activeBasketIds: p.activeBasketIds,
      positions: p.heldTokens.map((h) => ({
        symbol: h.token.symbol,
        name: h.token.name,
        balance: h.balance,
        valueUsd: h.valueUsd,
      })),
    }
  }

  const legacy = response as {
    walletAddress?: string
    totalValueUsd?: number
    profitLossPercent?: number
    positions?: PortfolioPosition[]
  }

  const positions = legacy.positions ?? []
  const totalValueUsd =
    legacy.totalValueUsd ?? positions.reduce((s, pos) => s + pos.valueUsd, 0)

  return {
    walletAddress: legacy.walletAddress ?? DEMO_QUOTE_WALLET,
    totalValueUsd,
    costBasisUsd: totalValueUsd / (1 + (legacy.profitLossPercent ?? 0) / 100),
    profitLossPercent: legacy.profitLossPercent ?? 0,
    change24hPercent: legacy.profitLossPercent ?? 0,
    heldTokens: [],
    activeBasketIds: [],
    positions,
  }
}

/**
 * POST /api/v1/portfolio/sell-all — legacy backend quote path (sell-all flow).
 */
export async function fetchSellAllQuoteFromBackend(
  request: PortfolioSellRequest
): Promise<BasketQuotePreview> {
  return apiClient<BasketQuotePreview>('/api/v1/portfolio/sell-all', {
    method: 'POST',
    body: request,
  })
}

export async function fetchPortfolioHealth(): Promise<{ status: string }> {
  return apiClient<{ status: string }>('/api/v1/health')
}
