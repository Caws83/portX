import { useState, useCallback } from 'react'
import { getBasketSwapQuotes, type SwapQuote } from '@/services/dexRouter'
import type { Basket } from '@/types/basket'

export function useSwapQuote(slippageBps = 50) {
  const [quotes, setQuotes] = useState<SwapQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotes = useCallback(
    async (basket: Basket, totalUsd: number) => {
      setLoading(true)
      setError(null)
      try {
        const result = await getBasketSwapQuotes({
          allocations: basket.allocations,
          totalUsd,
          slippageBps,
        })
        setQuotes(result)
        return result
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch quotes')
        return []
      } finally {
        setLoading(false)
      }
    },
    [slippageBps]
  )

  const clearQuotes = useCallback(() => {
    setQuotes([])
    setError(null)
  }, [])

  return { quotes, loading, error, fetchQuotes, clearQuotes }
}
