import type { Basket } from '@/types/basket'
import type { PortfolioDriftResult } from '@/utils/portfolioDrift'

interface PortfolioRebalancePreviewModalProps {
  open: boolean
  basket: Basket | null
  drift: PortfolioDriftResult | null
  onClose: () => void
}

function differenceClass(diff: number): string {
  if (Math.abs(diff) < 1) return 'text-portx-muted'
  if (diff > 0) return 'text-portx-green'
  return 'text-amber-400'
}

export function PortfolioRebalancePreviewModal({
  open,
  basket,
  drift,
  onClose,
}: PortfolioRebalancePreviewModalProps) {
  if (!open || !basket || !drift) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rebalance-preview-title"
      onClick={onClose}
    >
      <div
        className="card-glow w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted mb-1">
              Preview only
            </p>
            <h2 id="rebalance-preview-title" className="text-xl font-bold">
              Rebalance preview
            </h2>
            <p className="text-sm text-portx-muted mt-1">{basket.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-portx-muted hover:text-white text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-portx-muted mb-5">
          Target vs current allocation among basket assets. No transactions will be submitted.
        </p>

        <div className="space-y-3 mb-6">
          {drift.legs.map((leg) => (
            <div
              key={leg.symbol}
              className="rounded-xl border border-portx-border bg-portx-surface/50 p-4"
            >
              <p className="font-semibold mb-3">{leg.symbol}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-portx-muted text-xs">Target</dt>
                  <dd className="font-mono font-medium">{leg.targetPercent}%</dd>
                </div>
                <div>
                  <dt className="text-portx-muted text-xs">Current</dt>
                  <dd className="font-mono font-medium">{leg.currentPercent}%</dd>
                </div>
              </dl>
              <p className={`text-xs font-mono mt-2 ${differenceClass(leg.differencePercent)}`}>
                {leg.differencePercent > 0 ? '+' : ''}
                {leg.differencePercent}% vs target
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-portx-border/80 bg-portx-surface/40 px-4 py-3 text-xs text-portx-muted mb-5">
          Total drift score: <span className="font-mono text-white">{drift.totalDriftScore}%</span>
          {' · '}
          {drift.affectedAssetCount} asset{drift.affectedAssetCount === 1 ? '' : 's'} off target
        </div>

        <button type="button" onClick={onClose} className="btn-secondary w-full">
          Close preview
        </button>
      </div>
    </div>
  )
}
