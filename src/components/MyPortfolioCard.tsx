import { Link } from 'react-router-dom'
import type { Basket } from '@/types/basket'
import { BasketChainBadge } from '@/components/BasketChainBadge'
import { PortfolioDriftBadge } from '@/components/PortfolioDriftBadge'
import { PortfolioTargetControls } from '@/components/PortfolioTargetControls'
import { formatUsd } from '@/utils/format'
import { TESTNET_BUTTONS } from '@/config/testnetUxCopy'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import type { DriftStatusLevel } from '@/utils/portfolioDrift'

interface MyPortfolioCardProps {
  basket: Basket
  basketId?: string
  estimatedValueUsd?: number
  estimatedValueDisplay?: string
  performanceNote?: string
  ownershipNote?: string
  onBuyMore?: () => void
  onSell?: () => void
  onRebalance?: () => void
  canSell?: boolean
  driftStatus?: DriftStatusLevel
  showTargets?: boolean
}

export function MyPortfolioCard({
  basket,
  basketId,
  estimatedValueUsd,
  estimatedValueDisplay,
  performanceNote = 'Performance tracking coming soon',
  ownershipNote,
  onBuyMore,
  onSell,
  onRebalance,
  canSell = true,
  driftStatus,
  showTargets = true,
}: MyPortfolioCardProps) {
  const valueLabel =
    estimatedValueDisplay ??
    (estimatedValueUsd != null ? formatUsd(estimatedValueUsd) : '—')

  const resolvedBasketId = basketId ?? basket.id

  return (
    <div className="card-glow flex flex-col h-full min-w-0 border-portx-green/20">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-portx-green mb-1">
            My Portfolio
          </p>
          <h3 className="text-lg font-bold">{basket.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="badge">{basket.tag}</span>
            <BasketChainBadge chainLabel={basket.chainLabel} chainStatus={basket.chainStatus} />
            {driftStatus && <PortfolioDriftBadge status={driftStatus} />}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-portx-muted uppercase tracking-wide">Est. value</p>
          <p className="text-lg font-semibold tabular-nums text-portx-green">{valueLabel}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {basket.allocations.map(({ token, weightPercent }) => (
          <span
            key={token.symbol}
            className="text-xs px-2 py-1 rounded-md bg-portx-surface border border-portx-border font-mono"
          >
            {token.symbol} {weightPercent}%
          </span>
        ))}
      </div>

      <p className="text-xs text-portx-muted mb-1">{performanceNote}</p>
      {ownershipNote && <p className="text-xs text-zinc-500 mb-3">{ownershipNote}</p>}

      <div className="flex flex-col gap-2 mt-auto pt-2">
        {onBuyMore && (
          <button type="button" onClick={onBuyMore} className="btn-primary w-full text-sm py-2.5">
            Buy More
          </button>
        )}
        {onSell && (
          <button
            type="button"
            onClick={onSell}
            disabled={!canSell}
            className="btn-secondary w-full text-sm py-2.5 disabled:opacity-50"
          >
            {ENABLE_TESTNET_MODE ? TESTNET_BUTTONS.previewSell : 'Sell'}
          </button>
        )}
        {onRebalance && (
          <button
            type="button"
            onClick={onRebalance}
            className="btn-secondary w-full text-sm py-2.5 border-portx-blue/40 text-portx-blue"
          >
            Rebalance
          </button>
        )}
        {showTargets && ENABLE_TESTNET_MODE && (
          <PortfolioTargetControls basketId={resolvedBasketId} compact />
        )}
        <Link
          to="/settings"
          className="btn-secondary w-full text-sm py-2.5 text-center"
        >
          View History
        </Link>
      </div>
    </div>
  )
}
