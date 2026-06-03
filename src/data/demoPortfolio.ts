import type { HeldToken } from '@/types/portfolio'
import type { BasketPurchase } from '@/types/basket'
import { DEMO_TOKENS } from '@/data/tokens'

/** Local fallback snapshot — used when GET /portfolio/demo/:wallet is unavailable. */
export const FALLBACK_HELD_TOKENS: HeldToken[] = [
  { token: DEMO_TOKENS[0], balance: 1.2, valueUsd: 4140 },
  { token: DEMO_TOKENS[2], balance: 15, valueUsd: 2670 },
  { token: DEMO_TOKENS[4], balance: 120, valueUsd: 1464 },
]

export const FALLBACK_ACTIVE_BASKET_IDS = ['top-5-crypto'] as const

export const FALLBACK_ACTIVE_BASKETS: BasketPurchase[] = [
  {
    basketId: 'top-5-crypto',
    amountUsd: 2500,
    purchasedAt: Date.now() - 86400000 * 7,
    entryValueUsd: 2500,
  },
]

export const FALLBACK_PORTFOLIO = {
  walletAddress: '0x0000000000000000000000000000000000000000',
  totalValueUsd: 8274,
  costBasisUsd: 7200,
  change24hPercent: 14.9,
  heldTokens: FALLBACK_HELD_TOKENS,
  activeBasketIds: [...FALLBACK_ACTIVE_BASKET_IDS],
}
