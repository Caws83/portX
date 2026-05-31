import type { ExecutionPlan } from '@/types/execution'
import { formatUsd, formatTokenAmount } from '@/utils/format'
import { formatSlippage } from '@/utils/slippage'
import { RouteProviderBadge } from './RouteProviderBadge'
import { ExecutionWarning } from './ExecutionWarning'

interface TransactionReviewModalProps {
  plan: ExecutionPlan | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  confirming?: boolean
}

export function TransactionReviewModal({
  plan,
  open,
  onClose,
  onConfirm,
  confirming,
}: TransactionReviewModalProps) {
  if (!open || !plan) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto card-glow border-portx-green/20 shadow-glow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Review Transaction</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-portx-muted hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-portx-muted mb-4">
          Non-custodial — you sign all swaps from your connected wallet. PortX never holds funds or
          private keys.
        </p>

        <div className="space-y-3 mb-6">
          {plan.legs.map((leg) => {
            const q = leg.quote
            return (
              <div
                key={leg.index}
                className="p-3 rounded-xl bg-portx-surface border border-portx-border text-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {q.inputToken.symbol} → {q.outputToken.symbol}
                  </span>
                  <RouteProviderBadge provider={q.provider} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-portx-muted font-mono">
                  <span>In: {formatUsd(q.inputAmountUsd)}</span>
                  <span>
                    Out: ~{formatTokenAmount(parseFloat(q.outputAmount))} {q.outputToken.symbol}
                  </span>
                  <span>Gas: {formatUsd(q.estimatedGasUsd)}</span>
                  <span>Impact: {q.priceImpactPercent.toFixed(2)}%</span>
                </div>
                <p className="text-[10px] text-portx-muted mt-2 truncate">
                  Route: {q.routeSummary.join(' → ')}
                </p>
              </div>
            )
          })}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm mb-6 p-4 rounded-xl bg-portx-surface border border-portx-border">
          <div>
            <dt className="text-portx-muted text-xs">Est. total out</dt>
            <dd className="font-mono font-bold text-portx-green">{formatUsd(plan.totalOutputUsd)}</dd>
          </div>
          <div>
            <dt className="text-portx-muted text-xs">Est. total gas</dt>
            <dd className="font-mono">{formatUsd(plan.totalGasUsd)}</dd>
          </div>
          <div>
            <dt className="text-portx-muted text-xs">Slippage</dt>
            <dd className="font-mono">{formatSlippage(plan.slippageBps)}</dd>
          </div>
          <div>
            <dt className="text-portx-muted text-xs">Swaps</dt>
            <dd className="font-mono">{plan.legs.length}</dd>
          </div>
        </dl>

        <ExecutionWarning
          warnings={[
            'Demo mode. Real swap execution is not live yet.',
            ...plan.warnings.filter((w) => !w.includes('Demo mode')),
          ]}
        />

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {confirming ? 'Processing...' : 'Confirm Demo Execution'}
          </button>
        </div>
      </div>
    </div>
  )
}
