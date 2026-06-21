import { formatUsd, formatPercent } from '@/utils/format'

type GlowTone = 'emerald' | 'sky' | 'rose' | 'none'

interface PortfolioCardProps {
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  highlight?: boolean
  glow?: GlowTone
}

const GLOW_SHADOW: Record<Exclude<GlowTone, 'none'>, string> = {
  emerald: 'shadow-[0_0_50px_-12px_rgba(16,185,129,0.18)] border-emerald-400/20',
  sky: 'shadow-[0_0_50px_-12px_rgba(56,189,248,0.16)] border-sky-400/20',
  rose: 'shadow-[0_0_50px_-12px_rgba(244,63,94,0.16)] border-rose-400/20',
}

const GLOW_BLOB: Record<Exclude<GlowTone, 'none'>, string> = {
  emerald: 'bg-emerald-400/10',
  sky: 'bg-sky-400/10',
  rose: 'bg-rose-400/10',
}

export function PortfolioCard({ label, value, subValue, trend, highlight, glow }: PortfolioCardProps) {
  const trendColor =
    trend === 'up' ? 'text-portx-green' : trend === 'down' ? 'text-portx-danger' : 'text-zinc-400'

  const tone: GlowTone = glow ?? (highlight ? 'emerald' : 'none')

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-zinc-800/40 via-zinc-900/50 to-zinc-950/60 p-5 shadow-card transition-colors duration-300 hover:border-white/10 ${
        tone !== 'none' ? GLOW_SHADOW[tone] : ''
      }`}
    >
      {tone !== 'none' && (
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full blur-3xl ${GLOW_BLOB[tone]}`}
        />
      )}
      <p className="relative text-xs font-medium text-zinc-400">{label}</p>
      <p className="relative mt-1.5 text-2xl md:text-3xl font-semibold tracking-tight tabular-nums text-white">
        {value}
      </p>
      {subValue && (
        <p className={`relative mt-1.5 text-sm font-medium tabular-nums ${trendColor}`}>{subValue}</p>
      )}
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
        glow={pnlUsd >= 0 ? 'emerald' : 'rose'}
      />
    </div>
  )
}
