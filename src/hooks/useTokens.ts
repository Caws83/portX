import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchTokens } from '@/api/tokens'
import { DEMO_TOKENS, getTokenBySymbol as getFallbackTokenBySymbol } from '@/data/tokens'
import type { Token } from '@/types/token'

export type TokensSource = 'api' | 'fallback'

export function useTokens() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [tokensLoading, setTokensLoading] = useState(true)
  const [tokensError, setTokensError] = useState<string | null>(null)
  const [tokensSource, setTokensSource] = useState<TokensSource | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadTokens() {
      setTokensLoading(true)
      setTokensError(null)

      try {
        const list = await fetchTokens()
        if (cancelled) return
        setTokens(list)
        setTokensSource('api')
      } catch (err) {
        if (cancelled) return
        setTokens(DEMO_TOKENS)
        setTokensSource('fallback')
        const message =
          err instanceof Error ? err.message : 'Unable to load tokens from API'
        setTokensError(message)
        console.warn('[PortX] Tokens API unavailable — using local tokens fallback.', err)
      } finally {
        if (!cancelled) setTokensLoading(false)
      }
    }

    void loadTokens()
    return () => {
      cancelled = true
    }
  }, [])

  const getTokenBySymbol = useCallback(
    (symbol: string): Token | undefined => {
      const fromList = tokens.find((t) => t.symbol === symbol)
      if (fromList) return fromList
      return getFallbackTokenBySymbol(symbol)
    },
    [tokens]
  )

  const displayTokens = useMemo(
    () => (tokens.length > 0 ? tokens : DEMO_TOKENS),
    [tokens]
  )

  return {
    tokens: displayTokens,
    tokensLoading,
    tokensError,
    tokensSource,
    getTokenBySymbol,
  }
}
