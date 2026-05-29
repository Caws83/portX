import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Basket } from '@/types/basket'
import { DEMO_BASKETS } from '@/data/demoBaskets'

interface BasketState {
  customBaskets: Basket[]
  addCustomBasket: (basket: Basket) => void
  removeCustomBasket: (id: string) => void
  getAllBaskets: () => Basket[]
}

export const useBasketStore = create<BasketState>()(
  persist(
    (set, get) => ({
      customBaskets: [],

      addCustomBasket: (basket) =>
        set((s) => ({
          customBaskets: [...s.customBaskets, { ...basket, isCustom: true, createdAt: Date.now() }],
        })),

      removeCustomBasket: (id) =>
        set((s) => ({
          customBaskets: s.customBaskets.filter((b) => b.id !== id),
        })),

      getAllBaskets: () => [...DEMO_BASKETS, ...get().customBaskets],
    }),
    { name: 'portx-baskets' }
  )
)
