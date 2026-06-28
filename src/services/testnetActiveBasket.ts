import type { Basket } from '@/types/basket'
import {
  TESTNET_MULTI_TOKEN_BASKET,
  TESTNET_MULTI_TOKEN_BASKET_ID,
} from '@/data/testnetMultiTokenBasket'
import type { TestnetPortfolioPosition } from '@/services/testnetPortfolio'
import { hasMeaningfulTestnetBasketHoldings } from '@/utils/testnetOwnedPortfolio'

export interface InferredTestnetActiveBasket {
  basketId: string
  basketName: string
  source: 'holdings' | 'history' | 'both'
}

/** Infer active Sepolia baskets from on-chain holdings (authoritative) */
export function inferActiveTestnetBaskets(
  balancesWei: Record<string, bigint>,
  _positions: TestnetPortfolioPosition[],
  resolveBasket: (basketId: string) => Basket | undefined,
): InferredTestnetActiveBasket[] {
  const hasHoldings = hasMeaningfulTestnetBasketHoldings(balancesWei)

  if (!hasHoldings) {
    return []
  }

  const basket = resolveBasket(TESTNET_MULTI_TOKEN_BASKET_ID) ?? TESTNET_MULTI_TOKEN_BASKET

  return [
    {
      basketId: basket.id,
      basketName: basket.name,
      source: 'holdings',
    },
  ]
}
