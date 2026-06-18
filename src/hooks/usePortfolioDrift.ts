import { useMemo } from 'react'
import type { Basket } from '@/types/basket'
import type { HeldToken } from '@/types/portfolio'
import {
  computePortfolioDrift,
  type PortfolioDriftResult,
} from '@/utils/portfolioDrift'

export interface BasketDriftEntry {
  basketId: string
  basketName: string
  drift: PortfolioDriftResult
}

export function usePortfolioDrift(
  heldTokens: HeldToken[],
  baskets: Array<{ basket: Basket; basketId: string }>
): {
  entries: BasketDriftEntry[]
  primaryDrift: BasketDriftEntry | null
  getDriftForBasket: (basketId: string) => PortfolioDriftResult | null
} {
  const entries = useMemo(
    () =>
      baskets.map(({ basket, basketId }) => ({
        basketId,
        basketName: basket.name,
        drift: computePortfolioDrift(basket.allocations, heldTokens),
      })),
    [baskets, heldTokens]
  )

  const primaryDrift = useMemo(() => {
    if (entries.length === 0) return null
    return entries.reduce((worst, entry) =>
      entry.drift.totalDriftScore > worst.drift.totalDriftScore ? entry : worst
    )
  }, [entries])

  const getDriftForBasket = (basketId: string): PortfolioDriftResult | null =>
    entries.find((e) => e.basketId === basketId)?.drift ?? null

  return { entries, primaryDrift, getDriftForBasket }
}
