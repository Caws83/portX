import type { ChainStatus } from '@/types/basketChain'
import { formatChainBadgeLabel } from '@/types/basketChain'

interface BasketChainBadgeProps {
  chainLabel: string
  chainStatus: ChainStatus
}

export function BasketChainBadge({ chainLabel, chainStatus }: BasketChainBadgeProps) {
  const isActive = chainStatus === 'active'

  return (
    <span
      className={
        isActive
          ? 'badge text-[10px] shrink-0'
          : 'badge-blue text-[10px] shrink-0'
      }
    >
      {formatChainBadgeLabel(chainLabel, chainStatus)}
    </span>
  )
}
