import type { AgentRulesResponse } from '../types/agent.js'
import type { PortfolioRule } from '../types/portfolio.js'
import { getDemoPortfolio } from '../data/demoPortfolio.js'
import { normalizeAddress } from '../utils/format.js'

export function getPortfolioForWallet(walletAddress: string) {
  return getDemoPortfolio(walletAddress)
}

export function getDemoAgentRules(walletAddress: string): AgentRulesResponse {
  const key = normalizeAddress(walletAddress)
  const rules: PortfolioRule[] = [
    {
      id: 'take-profit-2x',
      type: 'take_profit',
      label: 'Sell all at 2x',
      enabled: true,
      config: { multiplier: 2, action: 'sell_all' },
    },
    {
      id: 'stop-loss-20',
      type: 'stop_loss',
      label: 'Stop loss at -20%',
      enabled: true,
      config: { drawdownPercent: 20, action: 'sell_all' },
    },
    {
      id: 'rebalance-monthly',
      type: 'rebalance',
      label: 'Rebalance monthly',
      enabled: false,
      config: { intervalDays: 30, targetDriftPercent: 5 },
    },
  ]

  // Future: Gelato / Chainlink Automation + AI agent runners
  return {
    walletAddress: key,
    mode: 'demo',
    rules,
  }
}
