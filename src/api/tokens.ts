import { PORTX_API_URL } from '@/config/constants'
import { apiClient, ApiError } from './client'
import type { Token } from '@/types/token'

export interface TokensApiResponse {
  count: number
  tokens: Token[]
}

/**
 * GET ${VITE_PORTX_API_URL}/tokens
 * Returns supported tokens from the PortX API (Railway in production).
 */
export async function fetchTokens(): Promise<Token[]> {
  if (!PORTX_API_URL) {
    throw new ApiError('VITE_PORTX_API_URL is not configured')
  }

  const data = await apiClient<TokensApiResponse>('/tokens')
  return data.tokens
}
