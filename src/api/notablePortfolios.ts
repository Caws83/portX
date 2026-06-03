import { PORTX_API_URL } from '@/config/constants'
import { apiClient, ApiError } from './client'
import type { NotablePortfolio } from '@/types/whale'

export interface NotablePortfoliosApiResponse {
  count: number
  disclaimer?: string
  portfolios: NotablePortfolio[]
}

/**
 * GET ${VITE_PORTX_API_URL}/notable-portfolios
 * Returns trending / notable portfolios for Discover (Railway in production).
 */
export async function fetchNotablePortfolios(): Promise<NotablePortfolio[]> {
  if (!PORTX_API_URL) {
    throw new ApiError('VITE_PORTX_API_URL is not configured')
  }

  const data = await apiClient<NotablePortfoliosApiResponse>('/notable-portfolios')
  return data.portfolios
}
