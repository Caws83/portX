import { useMemo } from 'react'
import { useBasketStore } from '@/store/basketStore'
import { DEMO_BASKETS } from '@/data/demoBaskets'
import type { Basket } from '@/types/basket'

export function useBasket() {
  const customBaskets = useBasketStore((s) => s.customBaskets)
  const addCustomBasket = useBasketStore((s) => s.addCustomBasket)
  const removeCustomBasket = useBasketStore((s) => s.removeCustomBasket)

  const allBaskets = useMemo(
    () => [...DEMO_BASKETS, ...customBaskets],
    [customBaskets]
  )

  const getBasketById = (id: string): Basket | undefined =>
    allBaskets.find((b) => b.id === id)

  return {
    allBaskets,
    customBaskets,
    demoBaskets: DEMO_BASKETS,
    addCustomBasket,
    removeCustomBasket,
    getBasketById,
  }
}
