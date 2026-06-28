import type { Basket } from '@/types/basket'
import {
  TESTNET_MULTI_TOKEN_BASKET,
  TESTNET_MULTI_TOKEN_BASKET_ID,
} from '@/data/testnetMultiTokenBasket'
import type { TestnetPortfolioPosition } from '@/services/testnetPortfolio'
import { hasTestnetMultiTokenBasketHoldings } from '@/utils/testnetBasketHoldings'

export interface InferredTestnetActiveBasket {
  basketId: string
  basketName: string
  source: 'holdings' | 'history' | 'both'
}

function hasSuccessfulMultiTokenBuy(positions: TestnetPortfolioPosition[]): boolean {
  return positions.some(
    (position) =>
      position.status === 'success' &&
      position.planType !== 'sell_basket' &&
      (position.portfolioId.startsWith(`${TESTNET_MULTI_TOKEN_BASKET_ID}-`) ||
        position.basketLabel === TESTNET_MULTI_TOKEN_BASKET.name),
  )
}

/** Infer active Sepolia baskets from on-chain holdings (authoritative) and optional buy history */
export function inferActiveTestnetBaskets(
  balancesWei: Record<string, bigint>,
  positions: TestnetPortfolioPosition[],
  resolveBasket: (basketId: string) => Basket | undefined,
): InferredTestnetActiveBasket[] {
  const hasHoldings = hasTestnetMultiTokenBasketHoldings(balancesWei)
  const hasBuyHistory = hasSuccessfulMultiTokenBuy(positions)

  if (!hasHoldings && !hasBuyHistory) {
    return []
  }

  const basket = resolveBasket(TESTNET_MULTI_TOKEN_BASKET_ID) ?? TESTNET_MULTI_TOKEN_BASKET

  return [
    {
      basketId: basket.id,
      basketName: basket.name,
      source: hasHoldings && hasBuyHistory ? 'both' : hasHoldings ? 'holdings' : 'history',
    },
  ]
}
