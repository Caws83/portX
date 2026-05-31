import { apiClient } from './client'
import type { QuoteRequest, QuoteResponse, BasketQuotePreview } from '@/types/quote'
import type { ExecutionPlan } from '@/types/execution'

export interface BackendQuoteRequest {
  legs: QuoteRequest[]
  type: 'buy' | 'sell_basket' | 'sell_all'
  basketId?: string
  basketName?: string
}

/**
 * BACKEND QUOTE VALIDATION will happen here.
 * POST /api/v1/quotes/basket — server aggregates 0x/1inch/Uniswap with API keys.
 */
export async function fetchBasketQuoteFromBackend(
  payload: BackendQuoteRequest
): Promise<BasketQuotePreview> {
  return apiClient<BasketQuotePreview>('/api/v1/quotes/basket', {
    method: 'POST',
    body: payload,
  })
}

export async function fetchSingleQuoteFromBackend(
  request: QuoteRequest
): Promise<QuoteResponse[]> {
  return apiClient<QuoteResponse[]>('/api/v1/quotes/single', {
    method: 'POST',
    body: request,
  })
}

export async function validateExecutionPlan(plan: ExecutionPlan): Promise<ExecutionPlan> {
  // BACKEND QUOTE VALIDATION: re-quote and compare before user signs
  return apiClient<ExecutionPlan>('/api/v1/quotes/validate', {
    method: 'POST',
    body: plan,
  })
}
