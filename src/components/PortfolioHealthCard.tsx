import type { PortfolioDriftResult } from '@/utils/portfolioDrift'
import { PortfolioDriftBadge } from '@/components/PortfolioDriftBadge'
import { formatPercent } from '@/utils/format'

interface PortfolioHealthCardProps {
  drift: PortfolioDriftResult | null
  basketName?: string
  className?: string
}

export function PortfolioHealthCard({ drift, basketName, className = '' }: PortfolioHealthCardProps) {
  if (!drift) {
    return (
      <div className={`card ${className}`}>
        <h2 className="text-lg font-bold mb-2">Portfolio Health</h2>
        <p className="text-sm text-portx-muted">
          Add an active basket to track allocation drift against your target weights.
        </p>
      </div>
    )
  }

  return (
    <div className={`card-glow ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold">Portfolio Health</h2>
          {basketName && (
            <p className="text-xs text-portx-muted mt-1">vs {basketName}</p>
          )}
        </div>
        <PortfolioDriftBadge status={drift.status} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-portx-border bg-portx-surface/60 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-portx-muted">Drift</p>
          <p className="text-xl font-bold font-mono text-portx-green mt-0.5">
            {formatPercent(drift.totalDriftScore, false)}
          </p>
        </div>
        <div className="rounded-xl border border-portx-border bg-portx-surface/60 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-portx-muted">Status</p>
          <p className="text-sm font-semibold mt-1">{drift.statusLabel}</p>
        </div>
        <div className="rounded-xl border border-portx-border bg-portx-surface/60 px-3 py-2.5 col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-wide text-portx-muted">Affected assets</p>
          <p className="text-xl font-bold font-mono mt-0.5">{drift.affectedAssetCount}</p>
        </div>
      </div>

      <p className="text-xs text-portx-muted mt-4">
        Preview only — drift detection does not trigger automatic rebalancing.
      </p>
    </div>
  )
}
