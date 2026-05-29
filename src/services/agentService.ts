export type AgentStatus = 'idle' | 'armed' | 'running' | 'disabled'

export interface AgentConfig {
  id: string
  name: string
  description: string
  status: AgentStatus
  params?: Record<string, string | number>
}

/**
 * AI AGENT SERVICE PLACEHOLDER
 * Future: connect to Cursor SDK, custom scripts, or on-chain keepers (Gelato, Chainlink Automation)
 */
export const DEMO_AGENTS: AgentConfig[] = [
  {
    id: 'auto-exit',
    name: 'Auto Exit Agent',
    description: 'Monitors portfolio and triggers full exit when conditions are met.',
    status: 'disabled',
  },
  {
    id: 'profit-lock',
    name: 'Profit Lock Agent',
    description: 'Locks in gains by scaling out as portfolio hits profit milestones.',
    status: 'disabled',
  },
  {
    id: 'rebalance',
    name: 'Rebalance Agent',
    description: 'Keeps basket weights aligned with target allocation over time.',
    status: 'disabled',
  },
  {
    id: 'risk-off',
    name: 'Risk-Off Agent',
    description: 'Rotates into stables when volatility or drawdown thresholds breach.',
    status: 'disabled',
  },
]

export async function armAgent(agentId: string, _params?: Record<string, unknown>): Promise<boolean> {
  // TODO: AI AGENT — register keeper job or start automation script
  console.info('[PortX Agent] arm requested:', agentId)
  await new Promise((r) => setTimeout(r, 300))
  return true
}

export async function disarmAgent(agentId: string): Promise<boolean> {
  // TODO: AI AGENT — cancel automation / keeper
  console.info('[PortX Agent] disarm requested:', agentId)
  return true
}
