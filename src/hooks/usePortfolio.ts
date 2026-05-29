import { useMemo } from 'react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { percentChange, targetPriceFromMultiplier, stopLossPrice } from '@/utils/math'

export function usePortfolio() {
  const store = usePortfolioStore()

  const pnlUsd = store.totalValueUsd - store.costBasisUsd
  const pnlPercent = percentChange(store.totalValueUsd, store.costBasisUsd)

  const targetStatus = useMemo(() => {
    const { targets, totalValueUsd, costBasisUsd } = store
    let takeProfitHit = false
    let stopLossHit = false
    let targetPrice: number | null = null

    if (targets.takeProfitMultiplier) {
      targetPrice = targetPriceFromMultiplier(costBasisUsd, targets.takeProfitMultiplier)
      takeProfitHit = totalValueUsd >= targetPrice
    }
    if (targets.targetSellPriceUsd) {
      targetPrice = targets.targetSellPriceUsd
      takeProfitHit = totalValueUsd >= targets.targetSellPriceUsd
    }
    if (targets.stopLossPercent) {
      const stopPrice = stopLossPrice(costBasisUsd, targets.stopLossPercent)
      stopLossHit = totalValueUsd <= stopPrice
    }

    return { takeProfitHit, stopLossHit, targetPrice }
  }, [store])

  return {
    ...store,
    pnlUsd,
    pnlPercent,
    targetStatus,
  }
}
