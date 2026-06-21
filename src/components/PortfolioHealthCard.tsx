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
      <div className="relative flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Portfolio Health</h2>
          {basketName && (
            <p className="text-xs text-zinc-400 mt-1">vs {basketName}</p>
          )}
        </div>
        <PortfolioDriftBadge status={drift.status} />
      </div>

      <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Drift</p>
          <p className="text-xl font-semibold tracking-tight tabular-nums text-portx-green mt-1">
            {formatPercent(drift.totalDriftScore, false)}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Status</p>
          <p className="text-sm font-semibold tracking-tight mt-1.5 text-white">{drift.statusLabel}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Affected assets</p>
          <p className="text-xl font-semibold tracking-tight tabular-nums text-white mt-1">{drift.affectedAssetCount}</p>
        </div>
      </div>

      <p className="relative text-xs text-zinc-500 mt-4">
        Preview only — drift detection does not trigger automatic rebalancing.
      </p>
    </div>
  )
}
