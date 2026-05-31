import type { Token } from './token.js'

export interface HeldToken {
  token: Token
  balance: number
  valueUsd: number
}

export interface DemoPortfolio {
  walletAddress: string
  totalValueUsd: number
  costBasisUsd: number
  change24hPercent: number
  heldTokens: HeldToken[]
  activeBasketIds: string[]
}

export interface PortfolioRule {
  id: string
  type: 'take_profit' | 'stop_loss' | 'rebalance'
  label: string
  enabled: boolean
  config: Record<string, string | number | boolean>
}
