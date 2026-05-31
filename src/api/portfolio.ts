import { apiClient } from './client'
import type { BasketQuotePreview } from '@/types/quote'
import type { Token } from '@/types/token'

export interface PortfolioSellRequest {
  holdings: { token: Token; balance: number; valueUsd: number }[]
  outputToken: Token
  chainId: number
  walletAddress?: string
  slippageBps: number
}

/**
 * POST /api/v1/portfolio/sell-all — backend quote engine for full portfolio unwind.
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
