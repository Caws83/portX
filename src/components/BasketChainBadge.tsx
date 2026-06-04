import type { ChainStatus } from '@/types/basketChain'
import { formatChainBadgeLabel } from '@/types/basketChain'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface BasketChainBadgeProps {
  chainLabel: string
  chainStatus: ChainStatus
}

export function BasketChainBadge({ chainLabel, chainStatus }: BasketChainBadgeProps) {
  const variant = chainStatus === 'active' ? 'active' : 'planned'

  return (
    <StatusBadge
      variant={variant}
      label={formatChainBadgeLabel(chainLabel, chainStatus)}
      size="sm"
    />
  )
}
