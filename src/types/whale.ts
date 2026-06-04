import type { BasketChain, ChainStatus } from './basketChain'

export type PortfolioSourceType =
  | 'public_wallet'
  | 'company_holdings'
  | 'demo_strategy'
  | 'whale_watch'

export type RiskLevel = 'low' | 'medium' | 'high' | 'degen'

export interface TrendingAddress {
  id: string
  label: string
  shortAddress: string
  chain: string
  avatarColor: string
  estimatedValueUsd: number
  change24h: number
  tags: string[]
  verified: boolean
}

export interface PortfolioToken {
  symbol: string
  name: string
  allocationPercent: number
  chain: string
}

export interface NotablePortfolio {
  id: string
  name: string
  category: string
  description: string
  chain: BasketChain
  chainLabel: string
  chainStatus: ChainStatus
  sourceType: PortfolioSourceType
  estimatedValueUsd: number
  change24h: number
  riskLevel: RiskLevel
  tokens: PortfolioToken[]
  tags: string[]
  isCopyable: boolean
  disclaimer: string
}

export const DISCOVERY_DISCLAIMER =
  'These are demo/model portfolios for discovery only. PortX does not confirm ownership of public figures or companies unless official public wallet data is integrated. Always verify before trading.'
