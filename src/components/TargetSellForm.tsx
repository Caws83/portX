import { useState } from 'react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { isValidTakeProfitMultiplier, parseNumberInput } from '@/utils/validation'
import { formatUsd, formatMultiplier } from '@/utils/format'
import { targetPriceFromMultiplier } from '@/utils/math'

export function TargetSellForm() {
  const { targets, costBasisUsd, setTargets } = usePortfolioStore()
  const [multiplier, setMultiplier] = useState(
    targets.takeProfitMultiplier?.toString() ?? '2'
  )
  const [priceTarget, setPriceTarget] = useState(
    targets.targetSellPriceUsd?.toString() ?? ''
  )

  const mult = parseNumberInput(multiplier)
  const projectedTarget =
    mult && isValidTakeProfitMultiplier(mult)
      ? targetPriceFromMultiplier(costBasisUsd, mult)
      : null

  const handleSaveMultiplier = () => {
    if (!mult || !isValidTakeProfitMultiplier(mult)) return
    // SMART CONTRACT: register take-profit keeper on PortX vault
    setTargets({
      takeProfitMultiplier: mult,
      targetSellPriceUsd: targetPriceFromMultiplier(costBasisUsd, mult),
    })
  }

  const handleSavePrice = () => {
    const price = parseNumberInput(priceTarget)
    if (!price || price <= 0) return
    setTargets({ targetSellPriceUsd: price, takeProfitMultiplier: null })
  }

  return (
    <div className="card space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-1">Take-Profit Target</h3>
        <p className="text-sm text-portx-muted">
          Sell entire portfolio when value hits your target (e.g. 2x).
        </p>
      </div>

      <div>
        <label className="label" htmlFor="tp-mult">
          Multiplier (e.g. 2 = 2x)
        </label>
        <div className="flex gap-2">
          <input
            id="tp-mult"
            type="number"
            min="1.1"
            step="0.1"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            className="input-field flex-1"
            placeholder="2"
          />
          <button type="button" onClick={handleSaveMultiplier} className="btn-primary shrink-0">
            Set
          </button>
        </div>
        {projectedTarget && (
          <p className="text-sm text-portx-green mt-2">
            Target: {formatMultiplier(mult!)} → sell all at {formatUsd(projectedTarget)}
          </p>
        )}
        {targets.takeProfitMultiplier && (
          <p className="text-xs text-portx-muted mt-2">
            Active: {formatMultiplier(targets.takeProfitMultiplier)} take-profit
          </p>
        )}
      </div>

      <div className="border-t border-portx-border pt-4">
        <label className="label" htmlFor="tp-price">
          Or set absolute USD target
        </label>
        <div className="flex gap-2">
          <input
            id="tp-price"
            type="number"
            value={priceTarget}
            onChange={(e) => setPriceTarget(e.target.value)}
            className="input-field flex-1"
            placeholder="15000"
          />
          <button type="button" onClick={handleSavePrice} className="btn-secondary shrink-0">
            Set
          </button>
        </div>
      </div>
    </div>
  )
}
