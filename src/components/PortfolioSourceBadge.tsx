import type { PortfolioSourceType } from '@/types/whale'

const SOURCE_LABELS: Record<PortfolioSourceType, string> = {
  public_wallet: 'Public Wallet',
  company_holdings: 'Company Holdings',
  demo_strategy: 'Demo Strategy',
  whale_watch: 'Whale Watch',
}

const SOURCE_COLORS: Record<PortfolioSourceType, string> = {
  public_wallet: 'text-portx-blue border-portx-blue/30 bg-portx-blue/10',
  company_holdings: 'text-portx-green border-portx-green/30 bg-portx-green/10',
  demo_strategy: 'text-portx-muted border-portx-border bg-portx-surface',
  whale_watch: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
}

interface PortfolioSourceBadgeProps {
  sourceType: PortfolioSourceType
}

export function PortfolioSourceBadge({ sourceType }: PortfolioSourceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${SOURCE_COLORS[sourceType]}`}
    >
      {SOURCE_LABELS[sourceType]}
    </span>
  )
}
