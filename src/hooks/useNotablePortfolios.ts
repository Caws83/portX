import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchNotablePortfolios } from '@/api/notablePortfolios'
import {
  NOTABLE_PORTFOLIOS,
  WHALE_WATCH_PORTFOLIOS as FALLBACK_WHALE_WATCH,
  DISCOVERY_DISCLAIMER,
} from '@/data/notablePortfolios'
import type { NotablePortfolio } from '@/types/whale'

export type NotablePortfoliosSource = 'api' | 'fallback'

export function useNotablePortfolios() {
  const [portfolios, setPortfolios] = useState<NotablePortfolio[]>([])
  const [disclaimer, setDisclaimer] = useState(DISCOVERY_DISCLAIMER)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<NotablePortfoliosSource | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)

    try {
      const list = await fetchNotablePortfolios()
      if (signal?.cancelled) return
      setPortfolios(list)
      setDisclaimer(DISCOVERY_DISCLAIMER)
      setSource('api')
    } catch (err) {
      if (signal?.cancelled) return
      setPortfolios(NOTABLE_PORTFOLIOS)
      setDisclaimer(DISCOVERY_DISCLAIMER)
      setSource('fallback')
      const message =
        err instanceof Error ? err.message : 'Unable to load notable portfolios from API'
      setError(message)
      console.warn(
        '[PortX] Notable portfolios API unavailable — using local portfolio fallback.',
        err
      )
    } finally {
      if (!signal?.cancelled) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }
    void load(signal)
    return () => {
      signal.cancelled = true
    }
  }, [load, retryCount])

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1)
  }, [])

  const displayPortfolios = useMemo(
    () => (portfolios.length > 0 ? portfolios : NOTABLE_PORTFOLIOS),
    [portfolios]
  )

  const whaleWatchPortfolios = useMemo(
    () =>
      source === 'api'
        ? displayPortfolios.filter((p) => p.sourceType === 'whale_watch')
        : FALLBACK_WHALE_WATCH,
    [displayPortfolios, source]
  )

  return {
    portfolios: displayPortfolios,
    whaleWatchPortfolios,
    disclaimer,
    loading,
    error,
    source,
    retry,
  }
}
