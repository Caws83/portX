import { useState } from 'react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { isValidStopLossPercent, parseNumberInput } from '@/utils/validation'
import { formatUsd } from '@/utils/format'
import { stopLossPrice } from '@/utils/math'

export function StopLossForm() {
  const { targets, costBasisUsd, setTargets } = usePortfolioStore()
  const [percent, setPercent] = useState(targets.stopLossPercent?.toString() ?? '20')

  const pct = parseNumberInput(percent)
  const triggerPrice =
    pct && isValidStopLossPercent(pct) ? stopLossPrice(costBasisUsd, pct) : null

  const handleSave = () => {
    if (!pct || !isValidStopLossPercent(pct)) return
    // SMART CONTRACT: register stop-loss keeper — exit if portfolio drops X%
    setTargets({ stopLossPercent: pct })
  }

  const handleClear = () => {
    setTargets({ stopLossPercent: null })
    setPercent('20')
  }

  return (
    <div className="card space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-1">Stop-Loss Target</h3>
        <p className="text-sm text-portx-muted">
          Exit entire portfolio if value drops by this percentage from cost basis.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="sl-pct">
          Drawdown % (e.g. 20 = exit at -20%)
        </label>
        <div className="flex gap-2">
          <input
            id="sl-pct"
            type="number"
            min="1"
            max="99"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="input-field flex-1"
            placeholder="20"
          />
          <button type="button" onClick={handleSave} className="btn-primary shrink-0">
            Set
          </button>
        </div>
        {triggerPrice && (
          <p className="text-sm text-portx-danger mt-2">
            Trigger: sell all if portfolio falls below {formatUsd(triggerPrice)}
          </p>
        )}
        {targets.stopLossPercent != null && (
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-portx-muted">
              Active: -{targets.stopLossPercent}% stop-loss
            </p>
            <button type="button" onClick={handleClear} className="text-xs text-portx-muted hover:text-white">
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
