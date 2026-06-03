import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { fetchPortfolio } from '@/api/portfolio'
import { DEMO_QUOTE_WALLET } from '@/api/quotes'
import type { DemoPortfolioPayload } from '@/api/portfolio'
import { usePortfolioStore } from '@/store/portfolioStore'
import type { BasketPurchase } from '@/types/basket'
import type { HeldToken } from '@/types/portfolio'
import { percentChange, targetPriceFromMultiplier, stopLossPrice } from '@/utils/math'

export type PortfolioSource = 'api' | 'fallback' | null

function mapBasketIdsToPurchases(
  ids: string[],
  storeBaskets: BasketPurchase[]
): BasketPurchase[] {
  return ids.map((basketId) => {
    const existing = storeBaskets.find((b) => b.basketId === basketId)
    return (
      existing ?? {
        basketId,
        amountUsd: 0,
        purchasedAt: 0,
        entryValueUsd: 0,
      }
    )
  })
}

export function usePortfolio() {
  const { address } = useAccount()
  const store = usePortfolioStore()

  const [apiView, setApiView] = useState<DemoPortfolioPayload | null>(null)
  const [profitLossPercent, setProfitLossPercent] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<PortfolioSource>(null)
  const [retryCount, setRetryCount] = useState(0)

  const walletAddress = address ?? DEMO_QUOTE_WALLET

  const load = useCallback(
    async (signal?: { cancelled: boolean }) => {
      setLoading(true)
      setError(null)

      try {
        const view = await fetchPortfolio(walletAddress)
        if (signal?.cancelled) return
        setApiView({
          walletAddress: view.walletAddress,
          totalValueUsd: view.totalValueUsd,
          costBasisUsd: view.costBasisUsd,
          change24hPercent: view.change24hPercent,
          heldTokens: view.heldTokens,
          activeBasketIds: view.activeBasketIds,
        })
        setProfitLossPercent(view.profitLossPercent)
        setSource('api')
      } catch (err) {
        if (signal?.cancelled) return
        setApiView(null)
        setProfitLossPercent(null)
        setSource('fallback')
        const message =
          err instanceof Error ? err.message : 'Unable to load portfolio from API'
        setError(message)
        console.warn(
          '[PortX] Portfolio API unavailable — using local portfolio fallback.',
          err
        )
      } finally {
        if (!signal?.cancelled) setLoading(false)
      }
    },
    [walletAddress]
  )

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

  const displayTotalValueUsd = apiView?.totalValueUsd ?? store.totalValueUsd
  const displayCostBasisUsd = apiView?.costBasisUsd ?? store.costBasisUsd
  const displayHeldTokens: HeldToken[] =
    apiView?.heldTokens?.length ? apiView.heldTokens : store.heldTokens
  const displayActiveBasketIds =
    apiView?.activeBasketIds ?? store.activeBaskets.map((b) => b.basketId)

  const displayActiveBaskets = useMemo(
    () => mapBasketIdsToPurchases(displayActiveBasketIds, store.activeBaskets),
    [displayActiveBasketIds, store.activeBaskets]
  )

  const pnlUsd = displayTotalValueUsd - displayCostBasisUsd
  const pnlPercent =
    profitLossPercent ??
    percentChange(displayTotalValueUsd, displayCostBasisUsd)

  const positionCount = displayHeldTokens.length
  const largestPosition = useMemo(() => {
    if (displayHeldTokens.length === 0) return null
    return displayHeldTokens.reduce((max, h) =>
      h.valueUsd > max.valueUsd ? h : max
    )
  }, [displayHeldTokens])

  const activeBasketsCount = displayActiveBasketIds.length

  const targetStatus = useMemo(() => {
    const { targets } = store
    let takeProfitHit = false
    let stopLossHit = false
    let targetPrice: number | null = null

    if (targets.takeProfitMultiplier) {
      targetPrice = targetPriceFromMultiplier(displayCostBasisUsd, targets.takeProfitMultiplier)
      takeProfitHit = displayTotalValueUsd >= targetPrice
    }
    if (targets.targetSellPriceUsd) {
      targetPrice = targets.targetSellPriceUsd
      takeProfitHit = displayTotalValueUsd >= targets.targetSellPriceUsd
    }
    if (targets.stopLossPercent) {
      const stopPrice = stopLossPrice(displayCostBasisUsd, targets.stopLossPercent)
      stopLossHit = displayTotalValueUsd <= stopPrice
    }

    return { takeProfitHit, stopLossHit, targetPrice }
  }, [store.targets, displayTotalValueUsd, displayCostBasisUsd])

  return {
    ...store,
    totalValueUsd: displayTotalValueUsd,
    costBasisUsd: displayCostBasisUsd,
    heldTokens: displayHeldTokens,
    activeBaskets: displayActiveBaskets,
    activeBasketIds: displayActiveBasketIds,
    pnlUsd,
    pnlPercent,
    positionCount,
    largestPosition,
    activeBasketsCount,
    targets: store.targets,
    targetStatus,
    portfolioLoading: loading,
    portfolioError: error,
    portfolioSource: source,
    retryPortfolio: retry,
  }
}
