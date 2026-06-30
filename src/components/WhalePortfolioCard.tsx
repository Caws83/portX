import type { NotablePortfolio, RiskLevel } from '@/types/whale'
import { formatUsd, formatPercent } from '@/utils/format'
import { BasketChainBadge } from './BasketChainBadge'
import { PortfolioSourceBadge } from './PortfolioSourceBadge'
import { CopyPortfolioButton } from './CopyPortfolioButton'
import { TokenLogo, ChainLogo } from './TokenLogo'
import { withDefaultChainMetadata } from '@/types/basketChain'

const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'text-portx-green',
  medium: 'text-portx-blue',
  high: 'text-portx-warning',
  degen: 'text-portx-danger',
}

interface WhalePortfolioCardProps {
  portfolio: NotablePortfolio
  compact?: boolean
}

export function WhalePortfolioCard({ portfolio, compact = false }: WhalePortfolioCardProps) {
  const trend = portfolio.change24h >= 0 ? 'text-portx-green' : 'text-portx-danger'
  const chainMeta = withDefaultChainMetadata(portfolio)

  return (
    <div
      className={`card-glow flex flex-col h-full min-w-0 hover:border-portx-green/30 transition-colors ${
        compact ? 'min-w-[260px] sm:min-w-[280px]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className={`font-bold ${compact ? 'text-base' : 'text-lg'}`}>{portfolio.name}</h3>
          <p className="text-xs text-portx-muted mt-0.5">{portfolio.category}</p>
          <div className="mt-1 flex items-center gap-2">
            <ChainLogo chain={chainMeta.chain} label={chainMeta.chainLabel} />
            <BasketChainBadge
              chainLabel={chainMeta.chainLabel}
              chainStatus={chainMeta.chainStatus}
            />
          </div>
        </div>
        <PortfolioSourceBadge sourceType={portfolio.sourceType} />
      </div>

      {!compact && (
        <p className="text-sm text-portx-muted mb-3 flex-grow">{portfolio.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <p className="text-xs text-portx-muted">Est. value</p>
          <p className="font-mono font-semibold">{formatUsd(portfolio.estimatedValueUsd, true)}</p>
        </div>
        <div>
          <p className="text-xs text-portx-muted">24h</p>
          <p className={`font-mono font-semibold ${trend}`}>{formatPercent(portfolio.change24h)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-portx-muted">Risk:</span>
        <span className={`text-xs font-semibold uppercase ${RISK_COLORS[portfolio.riskLevel]}`}>
          {portfolio.riskLevel}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {portfolio.tokens.map((t) => (
          <span
            key={t.symbol}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-portx-surface border border-portx-border font-mono"
          >
            <TokenLogo symbol={t.symbol} size="sm" />
            {t.symbol} {t.allocationPercent}%
          </span>
        ))}
      </div>

      {!compact && (
        <p className="text-[10px] text-portx-muted mb-3 leading-relaxed">{portfolio.disclaimer}</p>
      )}

      <CopyPortfolioButton portfolio={portfolio} className="w-full text-sm py-2.5 mt-auto" />
    </div>
  )
}
