import type { PortfolioRule } from './portfolio.js'

export interface AgentRulesResponse {
  walletAddress: string
  mode: 'demo'
  rules: PortfolioRule[]
}
