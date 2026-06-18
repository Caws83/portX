import type { DriftStatusLevel } from '@/utils/portfolioDrift'
import { DRIFT_STATUS_LABELS } from '@/utils/portfolioDrift'

const STATUS_CLASSES: Record<DriftStatusLevel, string> = {
  in_sync: 'bg-portx-green/10 text-portx-green border-portx-green/30',
  minor_drift: 'bg-portx-blue/10 text-portx-blue border-portx-blue/30',
  rebalance_recommended: 'bg-portx-warning/10 text-portx-warning border-portx-warning/30',
  out_of_sync: 'bg-portx-danger/10 text-portx-danger border-portx-danger/30',
}

interface PortfolioDriftBadgeProps {
  status: DriftStatusLevel
  label?: string
  className?: string
}

export function PortfolioDriftBadge({ status, label, className = '' }: PortfolioDriftBadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full text-[10px] px-2 py-0.5 uppercase tracking-wide ${STATUS_CLASSES[status]} ${className}`}
    >
      {label ?? DRIFT_STATUS_LABELS[status]}
    </span>
  )
}
