import { useState } from 'react'
import {
  formatTargetRule,
  getPortfolioBasketTargets,
  PORTFOLIO_TARGET_AUTOMATION_NOTE,
  setPortfolioStopLoss,
  setPortfolioTakeProfit,
  type PortfolioTargetRule,
  type PortfolioTargetSellAction,
} from '@/services/portfolioTargetAlerts'

interface PortfolioTargetControlsProps {
  basketId: string
  compact?: boolean
}

function TargetButtonGroup({
  label,
  active,
  onSelect,
}: {
  label: string
  active?: PortfolioTargetRule
  onSelect: (rule: PortfolioTargetRule) => void
}) {
  const [customPercent, setCustomPercent] = useState(
    active?.action === 'sell_custom' ? String(active.customPercent ?? '') : '',
  )

  const select = (action: PortfolioTargetSellAction) => {
    if (action === 'sell_custom') {
      const pct = Number.parseFloat(customPercent)
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return
      onSelect({ action, customPercent: pct })
      return
    }
    onSelect({ action })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-portx-muted uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => select('sell_100')} className="btn-secondary text-xs py-1.5 px-3">
          Sell 100%
        </button>
        <button type="button" onClick={() => select('sell_50')} className="btn-secondary text-xs py-1.5 px-3">
          Sell 50%
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          max={100}
          value={customPercent}
          onChange={(e) => setCustomPercent(e.target.value)}
          placeholder="Custom %"
          className="input-field flex-1 text-xs py-1.5"
        />
        <button
          type="button"
          onClick={() => select('sell_custom')}
          className="btn-secondary text-xs py-1.5 px-3 shrink-0"
        >
          Set custom
        </button>
      </div>
      {active && (
        <p className="text-xs text-portx-green">
          Saved: {formatTargetRule(active)}
        </p>
      )}
    </div>
  )
}

export function PortfolioTargetControls({ basketId, compact = false }: PortfolioTargetControlsProps) {
  const [targets, setTargets] = useState(() => getPortfolioBasketTargets(basketId))

  const handleTakeProfit = (rule: PortfolioTargetRule) => {
    setTargets(setPortfolioTakeProfit(basketId, rule))
  }

  const handleStopLoss = (rule: PortfolioTargetRule) => {
    setTargets(setPortfolioStopLoss(basketId, rule))
  }

  return (
    <div className={`rounded-xl border border-portx-border bg-black/20 ${compact ? 'p-3' : 'p-4'} space-y-4`}>
      <TargetButtonGroup
        label="Take Profit target"
        active={targets?.takeProfit}
        onSelect={handleTakeProfit}
      />
      <TargetButtonGroup
        label="Stop Loss target"
        active={targets?.stopLoss}
        onSelect={handleStopLoss}
      />
      <p className="text-[10px] text-portx-muted leading-relaxed">{PORTFOLIO_TARGET_AUTOMATION_NOTE}</p>
    </div>
  )
}
