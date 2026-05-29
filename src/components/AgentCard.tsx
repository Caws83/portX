import { useState } from 'react'
import type { AgentConfig } from '@/services/agentService'
import { armAgent, disarmAgent } from '@/services/agentService'

interface AgentCardProps {
  agent: AgentConfig
}

export function AgentCard({ agent }: AgentCardProps) {
  const [status, setStatus] = useState(agent.status)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      if (status === 'armed' || status === 'running') {
        await disarmAgent(agent.id)
        setStatus('disabled')
      } else {
        // AI AGENT PLACEHOLDER: wire automation script / keeper here
        await armAgent(agent.id)
        setStatus('armed')
      }
    } finally {
      setLoading(false)
    }
  }

  const statusLabel =
    status === 'armed'
      ? 'Armed (demo)'
      : status === 'running'
        ? 'Running'
        : 'Coming soon'

  return (
    <div className="card-glow flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-bold">{agent.name}</h3>
        <span
          className={`text-xs px-2 py-1 rounded-full border ${
            status === 'armed'
              ? 'border-portx-green/50 text-portx-green bg-portx-green/10'
              : 'border-portx-border text-portx-muted'
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <p className="text-sm text-portx-muted flex-grow mb-6">{agent.description}</p>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={status === 'armed' ? 'btn-secondary w-full' : 'btn-primary w-full opacity-80'}
      >
        {loading ? '...' : status === 'armed' ? 'Disarm Agent' : 'Arm Agent (Demo)'}
      </button>
      <p className="text-[10px] text-portx-muted text-center mt-3">
        AI automation integration placeholder
      </p>
    </div>
  )
}
