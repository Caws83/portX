import { AgentCard } from '@/components/AgentCard'
import { DEMO_AGENTS } from '@/services/agentService'

export function Agents() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="section-title">AI Agents</h1>
        <p className="text-portx-muted mt-1 max-w-2xl">
          Placeholder automation agents for future auto-trading scripts. Arm agents in demo mode —
          live execution will connect to keepers and AI strategy runners.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {DEMO_AGENTS.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      <div className="mt-10 card border-dashed text-center p-8">
        <p className="text-sm text-portx-muted">
          {/* AI AGENT: integrate Cursor SDK, Gelato, or custom script runner */}
          Future: Auto Exit, Profit Lock, Rebalance, and Risk-Off agents will execute strategies
          against your PortX portfolio via secure automation hooks.
        </p>
      </div>
    </div>
  )
}
