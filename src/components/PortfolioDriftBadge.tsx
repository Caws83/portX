import type { DriftStatusLevel } from '@/utils/portfolioDrift'
import { DRIFT_STATUS_LABELS } from '@/utils/portfolioDrift'

const STATUS_CLASSES: Record<DriftStatusLevel, string> = {
  in_sync: 'bg-emerald-500/10 text-emerald-400',
  minor_drift: 'bg-sky-500/10 text-sky-400',
  rebalance_recommended: 'bg-amber-500/10 text-amber-400',
  out_of_sync: 'bg-red-500/10 text-red-400',
}

interface PortfolioDriftBadgeProps {
  status: DriftStatusLevel
  label?: string
  className?: string
}

export function PortfolioDriftBadge({ status, label, className = '' }: PortfolioDriftBadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md text-[11px] px-2.5 py-1 uppercase tracking-wide ${STATUS_CLASSES[status]} ${className}`}
    >
      {label ?? DRIFT_STATUS_LABELS[status]}
    </span>
  )
}
