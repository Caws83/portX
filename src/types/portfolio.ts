import type { Token } from './token'
import type { BasketPurchase } from './basket'

export interface HeldToken {
  token: Token
  balance: number
  valueUsd: number
}

export interface PortfolioTargets {
  takeProfitMultiplier: number | null
  stopLossPercent: number | null
  targetSellPriceUsd: number | null
}

export interface Portfolio {
  totalValueUsd: number
  costBasisUsd: number
  heldTokens: HeldToken[]
  activeBaskets: BasketPurchase[]
  targets: PortfolioTargets
}
