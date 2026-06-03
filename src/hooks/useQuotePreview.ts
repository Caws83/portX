import { useState, useCallback, useRef } from 'react'
import { useAccount, useChainId } from 'wagmi'
import type { Basket } from '@/types/basket'
import type { HeldToken } from '@/types/portfolio'
import type { BasketQuotePreview } from '@/types/quote'
import type { ExecutionPlan } from '@/types/execution'
import { DEFAULT_SLIPPAGE_BPS, DEFAULT_STABLECOIN } from '@/config/constants'
import {
  previewBuyBasket,
  mapBuyBasketResponseToPreview,
  DEMO_QUOTE_WALLET,
} from '@/api/quotes'
import {
  getLocalBuyBasketQuotePreview,
  getSellBasketQuotePreview,
  getSellAllQuotePreview,
} from '@/services/quoteEngine'
import { buildExecutionPlan } from '@/services/transactionBuilder'

export type QuoteSource = 'api' | 'fallback' | null

function loadSlippage(): number {
  try {
    const raw = localStorage.getItem('portx-settings')
    if (raw) return JSON.parse(raw).slippageBps ?? DEFAULT_SLIPPAGE_BPS
  } catch {
    /* ignore */
  }
  return DEFAULT_SLIPPAGE_BPS
}

export function useQuotePreview() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [preview, setPreview] = useState<BasketQuotePreview | null>(null)
  const [plan, setPlan] = useState<ExecutionPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoteSource, setQuoteSource] = useState<QuoteSource>(null)
  const lastBuyRef = useRef<{ basket: Basket; amountUsd: number } | null>(null)

  const getParams = useCallback(
    () => ({
      chainId,
      walletAddress: address ?? DEMO_QUOTE_WALLET,
      slippageBps: loadSlippage(),
    }),
    [chainId, address]
  )

  const previewBuy = useCallback(
    async (basket: Basket, amountUsd: number) => {
      setLoading(true)
      setError(null)
      setPlan(null)
      setQuoteSource(null)
      lastBuyRef.current = { basket, amountUsd }

      const params = getParams()

      try {
        const response = await previewBuyBasket({
          walletAddress: params.walletAddress,
          chainId: params.chainId,
          inputToken: DEFAULT_STABLECOIN,
          inputAmountUsd: amountUsd,
          basketId: basket.id,
          slippageBps: params.slippageBps,
        })
        const result = mapBuyBasketResponseToPreview(
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
          '[PortX] Buy-basket quote API unavailable — using local quote fallback.',
          apiErr
        )
        try {
          const result = await getLocalBuyBasketQuotePreview(basket, amountUsd, params)
          setPreview(result)
          setQuoteSource('fallback')
          return result
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Quote failed'
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

  const retryBuyQuote = useCallback(async () => {
    const last = lastBuyRef.current
    if (!last) return null
    return previewBuy(last.basket, last.amountUsd)
  }, [previewBuy])

  const previewSellBasket = useCallback(
    async (basket: Basket, positionValueUsd: number) => {
      setLoading(true)
      setError(null)
      setPlan(null)
      setQuoteSource(null)
      try {
        const result = await getSellBasketQuotePreview(basket, positionValueUsd, getParams())
        setPreview(result)
        return result
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Quote failed'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [getParams]
  )

  const previewSellAll = useCallback(
    async (holdings: HeldToken[]) => {
      setLoading(true)
      setError(null)
      setPlan(null)
      setQuoteSource(null)
      try {
        const result = await getSellAllQuotePreview(holdings, getParams())
        setPreview(result)
        return result
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Quote failed'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [getParams]
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
    lastBuyRef.current = null
  }, [])

  return {
    preview,
    plan,
    loading,
    error,
    quoteSource,
    previewBuy,
    retryBuyQuote,
    previewSellBasket,
    previewSellAll,
    buildPlan,
    clear,
  }
}
