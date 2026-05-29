import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HeldToken, PortfolioTargets } from '@/types/portfolio'
import type { BasketPurchase } from '@/types/basket'
import { DEMO_TOKENS } from '@/data/tokens'

const INITIAL_HELD: HeldToken[] = [
  { token: DEMO_TOKENS[0], balance: 1.2, valueUsd: 4140 },
  { token: DEMO_TOKENS[2], balance: 15, valueUsd: 2670 },
  { token: DEMO_TOKENS[4], balance: 120, valueUsd: 1464 },
]

interface PortfolioState {
  totalValueUsd: number
  costBasisUsd: number
  heldTokens: HeldToken[]
  activeBaskets: BasketPurchase[]
  targets: PortfolioTargets
  setTargets: (targets: Partial<PortfolioTargets>) => void
  buyBasket: (purchase: BasketPurchase) => void
  sellBasket: (basketId: string) => void
  sellAllPortfolio: () => void
  refreshDemoPrices: () => void
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      totalValueUsd: 8274,
      costBasisUsd: 7200,
      heldTokens: INITIAL_HELD,
      activeBaskets: [
        {
          basketId: 'top-5-crypto',
          amountUsd: 2500,
          purchasedAt: Date.now() - 86400000 * 7,
          entryValueUsd: 2500,
        },
      ],
      targets: {
        takeProfitMultiplier: null,
        stopLossPercent: null,
        targetSellPriceUsd: null,
      },

      setTargets: (partial) =>
        set((s) => ({
          targets: { ...s.targets, ...partial },
        })),

      buyBasket: (purchase) => {
        // SMART CONTRACT: execute multi-token swap via PortX basket contract
        // DEX ROUTER: aggregate quotes from 0x / 1inch / Uniswap for each leg
        set((s) => ({
          activeBaskets: [...s.activeBaskets, purchase],
          totalValueUsd: s.totalValueUsd + purchase.amountUsd,
          costBasisUsd: s.costBasisUsd + purchase.amountUsd,
        }))
      },

      sellBasket: (basketId) => {
        // SMART CONTRACT: redeem basket position, route sells through DEX aggregator
        const basket = get().activeBaskets.find((b) => b.basketId === basketId)
        if (!basket) return
        set((s) => ({
          activeBaskets: s.activeBaskets.filter((b) => b.basketId !== basketId),
          totalValueUsd: Math.max(0, s.totalValueUsd - basket.amountUsd),
        }))
      },

      sellAllPortfolio: () => {
        // SMART CONTRACT: batch sell all held tokens + close basket positions
        // DEX ROUTER: getBestRoute() for full portfolio unwind
        set({
          heldTokens: [],
          activeBaskets: [],
          totalValueUsd: 0,
          costBasisUsd: 0,
          targets: {
            takeProfitMultiplier: null,
            stopLossPercent: null,
            targetSellPriceUsd: null,
          },
        })
      },

      refreshDemoPrices: () => {
        const jitter = () => 0.98 + Math.random() * 0.04
        set((s) => {
          const heldTokens = s.heldTokens.map((h) => ({
            ...h,
            valueUsd: h.valueUsd * jitter(),
          }))
          const totalValueUsd = heldTokens.reduce((a, h) => a + h.valueUsd, 0)
          return { heldTokens, totalValueUsd }
        })
      },
    }),
    { name: 'portx-portfolio' }
  )
)
