import { useEffect, useMemo, useState } from 'react'
import { fetchBaskets } from '@/api/baskets'
import { useBasketStore } from '@/store/basketStore'
import { DEMO_BASKETS } from '@/data/demoBaskets'
import type { Basket } from '@/types/basket'

export type BasketsSource = 'api' | 'fallback'

export function useBasket() {
  const customBaskets = useBasketStore((s) => s.customBaskets)
  const addCustomBasket = useBasketStore((s) => s.addCustomBasket)
  const removeCustomBasket = useBasketStore((s) => s.removeCustomBasket)

  const [demoBaskets, setDemoBaskets] = useState<Basket[]>([])
  const [basketsLoading, setBasketsLoading] = useState(true)
  const [basketsError, setBasketsError] = useState<string | null>(null)
  const [basketsSource, setBasketsSource] = useState<BasketsSource | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadBaskets() {
      setBasketsLoading(true)
      setBasketsError(null)

      try {
        const baskets = await fetchBaskets()
        if (cancelled) return
        setDemoBaskets(baskets)
        setBasketsSource('api')
      } catch (err) {
        if (cancelled) return
        setDemoBaskets(DEMO_BASKETS)
        setBasketsSource('fallback')
        const message =
          err instanceof Error ? err.message : 'Unable to load baskets from API'
        setBasketsError(message)
        console.warn('[PortX] Baskets API unavailable — using local demoBaskets fallback.', err)
      } finally {
        if (!cancelled) setBasketsLoading(false)
      }
    }

    void loadBaskets()
    return () => {
      cancelled = true
    }
  }, [])

  const allBaskets = useMemo(
    () => [...demoBaskets, ...customBaskets],
    [demoBaskets, customBaskets]
  )

  const getBasketById = (id: string): Basket | undefined =>
    allBaskets.find((b) => b.id === id)

  return {
    allBaskets,
    customBaskets,
    demoBaskets,
    basketsLoading,
    basketsError,
    basketsSource,
    addCustomBasket,
    removeCustomBasket,
    getBasketById,
  }
}
