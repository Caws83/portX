import { useState, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'
import type { Basket } from '@/types/basket'
import type { HeldToken } from '@/types/portfolio'
import type { BasketQuotePreview } from '@/types/quote'
import type { ExecutionPlan } from '@/types/execution'
import { DEFAULT_SLIPPAGE_BPS } from '@/config/constants'
import {
  getBuyBasketQuotePreview,
  getSellBasketQuotePreview,
  getSellAllQuotePreview,
} from '@/services/quoteEngine'
import { buildExecutionPlan } from '@/services/transactionBuilder'

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

  const params = {
    chainId,
    walletAddress: address,
    slippageBps: loadSlippage(),
  }

  const previewBuy = useCallback(
    async (basket: Basket, amountUsd: number) => {
      setLoading(true)
      setError(null)
      setPlan(null)
      try {
        const result = await getBuyBasketQuotePreview(basket, amountUsd, params)
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
    [chainId, address]
  )

  const previewSellBasket = useCallback(
    async (basket: Basket, positionValueUsd: number) => {
      setLoading(true)
      setError(null)
      setPlan(null)
      try {
        const result = await getSellBasketQuotePreview(basket, positionValueUsd, params)
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
    [chainId, address]
  )

  const previewSellAll = useCallback(
    async (holdings: HeldToken[]) => {
      setLoading(true)
      setError(null)
      setPlan(null)
      try {
        const result = await getSellAllQuotePreview(holdings, params)
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
    [chainId, address]
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
  }, [])

  return {
    preview,
    plan,
    loading,
    error,
    previewBuy,
    previewSellBasket,
    previewSellAll,
    buildPlan,
    clear,
  }
}
