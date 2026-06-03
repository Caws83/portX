import { useState, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'
import type { HeldToken } from '@/types/portfolio'
import type { BasketQuotePreview } from '@/types/quote'
import type { ExecutionPlan } from '@/types/execution'
import { DEFAULT_SLIPPAGE_BPS, DEFAULT_STABLECOIN } from '@/config/constants'
import {
  previewSellAll,
  mapSellAllResponseToPreview,
  DEMO_QUOTE_WALLET,
} from '@/api/quotes'
import { getLocalSellAllQuotePreview } from '@/services/quoteEngine'
import { buildExecutionPlan } from '@/services/transactionBuilder'

export type SellAllQuoteSource = 'api' | 'fallback' | null

function loadSlippage(): number {
  try {
    const raw = localStorage.getItem('portx-settings')
    if (raw) return JSON.parse(raw).slippageBps ?? DEFAULT_SLIPPAGE_BPS
  } catch {
    /* ignore */
  }
  return DEFAULT_SLIPPAGE_BPS
}

export function useSellAllPreview() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [preview, setPreview] = useState<BasketQuotePreview | null>(null)
  const [plan, setPlan] = useState<ExecutionPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoteSource, setQuoteSource] = useState<SellAllQuoteSource>(null)

  const getParams = useCallback(
    () => ({
      chainId,
      walletAddress: address ?? DEMO_QUOTE_WALLET,
      slippageBps: loadSlippage(),
    }),
    [chainId, address]
  )

  const previewSellAllPortfolio = useCallback(
    async (holdings: HeldToken[]) => {
      if (holdings.length === 0) return null

      setLoading(true)
      setError(null)
      setPlan(null)
      setQuoteSource(null)

      const params = getParams()

      try {
        const response = await previewSellAll({
          walletAddress: params.walletAddress,
          chainId: params.chainId,
          outputToken: DEFAULT_STABLECOIN,
          slippageBps: params.slippageBps,
        })
        const result = mapSellAllResponseToPreview(
          response,
          params.chainId,
          params.slippageBps,
          DEFAULT_STABLECOIN
        )
        setPreview(result)
        setQuoteSource('api')
        return result
      } catch (apiErr) {
        console.warn(
          '[PortX] Sell-all quote API unavailable — using local sell-all fallback.',
          apiErr
        )
        try {
          const result = await getLocalSellAllQuotePreview(holdings, params)
          setPreview(result)
          setQuoteSource('fallback')
          return result
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Sell-all quote failed'
          setError(msg)
          setQuoteSource(null)
          return null
        }
      } finally {
        setLoading(false)
      }
    },
    [getParams]
  )

  const retrySellAllQuote = useCallback(
    async (holdings: HeldToken[]) => previewSellAllPortfolio(holdings),
    [previewSellAllPortfolio]
  )

  const buildPlan = useCallback(
    (quotePreview: BasketQuotePreview) => {
      const execPlan = buildExecutionPlan(quotePreview, address)
      setPlan(execPlan)
      return execPlan
    },
    [address]
  )

  const clear = useCallback(() => {
    setPreview(null)
    setPlan(null)
    setError(null)
    setQuoteSource(null)
  }, [])

  return {
    preview,
    plan,
    loading,
    error,
    quoteSource,
    previewSellAllPortfolio,
    retrySellAllQuote,
    buildPlan,
    clear,
  }
}
