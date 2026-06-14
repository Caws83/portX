import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HeldToken, PortfolioTargets, SellBasketParams } from '@/types/portfolio'
import type { BasketPurchase } from '@/types/basket'
import type { TokenAllocation } from '@/types/token'
import { DEMO_TOKENS } from '@/data/tokens'
import {
  applyBasketBuyToHoldings,
  applyBasketSellToHoldings,
  sumHeldValueUsd,
} from '@/utils/portfolioHoldings'

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
  /** When true, UI reads persisted local demo mutations over API portfolio snapshot. */
  localDemoOverride: boolean
  setTargets: (targets: Partial<PortfolioTargets>) => void
  buyBasket: (purchase: BasketPurchase, allocations: TokenAllocation[]) => void
  sellBasket: (params: SellBasketParams) => void
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
      localDemoOverride: false,

      setTargets: (partial) =>
        set((s) => ({
          targets: { ...s.targets, ...partial },
        })),

      buyBasket: (purchase, allocations) => {
        set((s) => {
          const heldTokens = applyBasketBuyToHoldings(
            s.heldTokens,
            allocations,
            purchase.amountUsd
          )
          return {
            activeBaskets: [...s.activeBaskets, purchase],
            heldTokens,
            totalValueUsd: sumHeldValueUsd(heldTokens),
            costBasisUsd: s.costBasisUsd + purchase.amountUsd,
            localDemoOverride: true,
          }
        })
      },

      sellBasket: ({ basketId, allocations, positionValueUsd, entryValueUsd }) => {
        const basket = get().activeBaskets.find((b) => b.basketId === basketId)
        if (!basket) return

        set((s) => {
          const heldTokens = applyBasketSellToHoldings(
            s.heldTokens,
            allocations,
            positionValueUsd
          )
          const basisReduction = entryValueUsd ?? basket.entryValueUsd ?? basket.amountUsd

          return {
            activeBaskets: s.activeBaskets.filter((b) => b.basketId !== basketId),
            heldTokens,
            totalValueUsd: sumHeldValueUsd(heldTokens),
            costBasisUsd: Math.max(0, s.costBasisUsd - basisReduction),
            localDemoOverride: true,
          }
        })
      },

      sellAllPortfolio: () => {
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
          localDemoOverride: true,
        })
      },

      refreshDemoPrices: () => {
        const jitter = () => 0.98 + Math.random() * 0.04
        set((s) => {
          const heldTokens = s.heldTokens.map((h) => ({
            ...h,
            valueUsd: h.valueUsd * jitter(),
          }))
          const totalValueUsd = sumHeldValueUsd(heldTokens)
          return { heldTokens, totalValueUsd, localDemoOverride: true }
        })
      },
    }),
    { name: 'portx-portfolio' }
  )
)
