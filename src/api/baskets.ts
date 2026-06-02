import { PORTX_API_URL } from '@/config/constants'
import { apiClient, ApiError } from './client'
import type { Basket } from '@/types/basket'

export interface BasketsApiResponse {
  count: number
  baskets: Basket[]
}

/**
 * GET ${VITE_PORTX_API_URL}/baskets
 * Returns demo baskets from the PortX API (Railway in production).
 */
export async function fetchBaskets(): Promise<Basket[]> {
  if (!PORTX_API_URL) {
    throw new ApiError('VITE_PORTX_API_URL is not configured')
  }

  const data = await apiClient<BasketsApiResponse>('/baskets')
  return data.baskets
}
