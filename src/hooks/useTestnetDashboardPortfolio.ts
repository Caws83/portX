import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Basket } from '@/types/basket'
import { useBasket } from '@/hooks/useBasket'
import { useTestnetPortfolioBalances } from '@/hooks/useTestnetPortfolioBalances'
import {
  inferActiveTestnetBaskets,
  type InferredTestnetActiveBasket,
} from '@/services/testnetActiveBasket'
import {
  getTestnetPortfolioAggregate,
  TESTNET_PORTFOLIO_UPDATED_EVENT,
  type TestnetPortfolioAggregate,
  type TestnetPortfolioPosition,
} from '@/services/testnetPortfolio'
import type { TestnetValuedPortfolioAsset } from '@/services/testnetPortfolioPricing'
import type { TestnetPortfolioBalancesResult } from '@/hooks/useTestnetPortfolioBalances'

export interface TestnetDashboardActiveBasket {
  basket: Basket
  basketId: string
  basketName: string
  source: InferredTestnetActiveBasket['source']
}

export interface TestnetDashboardPortfolio {
  totalValueUsd: number
  totalValueDisplay: string
  largestAssetSymbol: string | null
  largestAssetValueDisplay: string | null
  assetCount: number
  activeBaskets: TestnetDashboardActiveBasket[]
  activeBasketsCount: number
  walletAssets: TestnetValuedPortfolioAsset[]
  latestExecution: TestnetPortfolioPosition | null
  aggregate: TestnetPortfolioAggregate
  balances: TestnetPortfolioBalancesResult
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refresh: () => void
}

export const TESTNET_DASHBOARD_REFRESH_EVENT = 'portx-testnet-dashboard-refresh'

export function useTestnetDashboardPortfolio(): TestnetDashboardPortfolio {
  const balances = useTestnetPortfolioBalances()
  const { getBasketById } = useBasket()
  const [aggregateVersion, setAggregateVersion] = useState(0)

  const bumpAggregate = useCallback(() => {
    setAggregateVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const handleUpdate = () => bumpAggregate()
    window.addEventListener(TESTNET_PORTFOLIO_UPDATED_EVENT, handleUpdate)
    window.addEventListener(TESTNET_DASHBOARD_REFRESH_EVENT, handleUpdate)
    return () => {
      window.removeEventListener(TESTNET_PORTFOLIO_UPDATED_EVENT, handleUpdate)
      window.removeEventListener(TESTNET_DASHBOARD_REFRESH_EVENT, handleUpdate)
    }
  }, [bumpAggregate])

  const aggregate = useMemo(
    () => getTestnetPortfolioAggregate(),
    [aggregateVersion, balances.lastRefreshedAt],
  )

  const walletAssets = useMemo(
    () => balances.valuation.valuedAssets.filter((asset) => asset.balanceNumeric > 0),
    [balances.valuation.valuedAssets],
  )

  const inferredActive = useMemo(
    () =>
      inferActiveTestnetBaskets(balances.balancesWei, aggregate.positions, (basketId) =>
        getBasketById(basketId),
      ),
    [balances.balancesWei, aggregate.positions, getBasketById],
  )

  const activeBaskets = useMemo((): TestnetDashboardActiveBasket[] => {
    return inferredActive.flatMap((entry) => {
      const basket = getBasketById(entry.basketId)
      if (!basket) return []
      return [
        {
          basket,
          basketId: entry.basketId,
          basketName: entry.basketName,
          source: entry.source,
        },
      ]
    })
  }, [inferredActive, getBasketById])

  const refresh = useCallback(() => {
    balances.refresh()
    bumpAggregate()
    window.dispatchEvent(new Event(TESTNET_DASHBOARD_REFRESH_EVENT))
  }, [balances, bumpAggregate])

  return {
    totalValueUsd: balances.valuation.totalEstimatedValueUsd,
    totalValueDisplay: balances.valuation.totalEstimatedValueDisplay,
    largestAssetSymbol: balances.valuation.largestAssetSymbol,
    largestAssetValueDisplay: balances.valuation.largestAssetValueDisplay,
    assetCount: balances.valuation.assetCount,
    activeBaskets,
    activeBasketsCount: activeBaskets.length,
    walletAssets,
    latestExecution: aggregate.latestPosition,
    aggregate,
    balances,
    isLoading: balances.isLoading,
    isFetching: balances.isFetching,
    error: balances.error,
    refresh,
  }
}
