import { formatUsd, formatPercent } from '@/utils/format'

interface PortfolioCardProps {
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  highlight?: boolean
}

export function PortfolioCard({ label, value, subValue, trend, highlight }: PortfolioCardProps) {
  const trendColor =
    trend === 'up' ? 'text-portx-green' : trend === 'down' ? 'text-portx-danger' : 'text-portx-muted'

  return (
    <div className={`card-glow ${highlight ? 'border-portx-green/30 shadow-glow' : ''}`}>
      <p className="text-sm text-portx-muted mb-2">{label}</p>
      <p className="text-2xl md:text-3xl font-bold font-mono tracking-tight">{value}</p>
      {subValue && <p className={`text-sm mt-2 font-medium ${trendColor}`}>{subValue}</p>}
    </div>
  )
}

interface PortfolioSummaryProps {
  totalValueUsd: number
  pnlUsd: number
  pnlPercent: number
  costBasisUsd: number
}

export function PortfolioSummary({ totalValueUsd, pnlUsd, pnlPercent, costBasisUsd }: PortfolioSummaryProps) {
  const trend = pnlUsd >= 0 ? 'up' : 'down'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <PortfolioCard label="Total Portfolio Value" value={formatUsd(totalValueUsd)} highlight />
      <PortfolioCard
        label="Profit / Loss"
        value={formatUsd(pnlUsd)}
        subValue={formatPercent(pnlPercent)}
        trend={trend}
      />
      <PortfolioCard label="Cost Basis" value={formatUsd(costBasisUsd)} />
      <PortfolioCard
        label="Return"
        value={formatPercent(pnlPercent, false)}
        subValue={pnlUsd >= 0 ? 'Bullish' : 'Drawdown'}
        trend={trend}
      />
    </div>
  )
}
