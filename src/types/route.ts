import type { QuoteRequest, QuoteResponse } from './quote'

export type QuoteProvider = '0x' | '1inch' | 'uniswap'

export interface RouteComparison {
  request: QuoteRequest
  quotes: QuoteResponse[]
  bestQuote: QuoteResponse
  selectedProvider: QuoteProvider
}

export const PROVIDER_PRIORITY: QuoteProvider[] = ['0x', '1inch', 'uniswap']

export const PROVIDER_LABELS: Record<QuoteProvider, string> = {
  '0x': '0x',
  '1inch': '1inch',
  uniswap: 'Uniswap',
}
