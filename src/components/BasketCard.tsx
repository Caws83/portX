import type { Basket } from '@/types/basket'
import { BasketChainBadge } from '@/components/BasketChainBadge'
import { PortfolioDriftBadge } from '@/components/PortfolioDriftBadge'
import { TokenLogo } from '@/components/TokenLogo'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatUsd } from '@/utils/format'
import { BUTTON_LABELS } from '@/config/uiCopy'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { canShowBasketQuotes } from '@/utils/basketCatalog'
import { SPORT_FAN_ROUTING_MESSAGE } from '@/data/sportFanBaskets'
import { getPlannedChainMessage } from '@/utils/chainRouting'
import {
  getSepoliaBasketExecutionTier,
  getSepoliaBasketTierLabel,
  SEPOLIA_STUB_BUTTON_LABEL,
  SEPOLIA_STUB_NOTICE,
  SEPOLIA_TEMPLATE_NOTICE,
} from '@/services/sepoliaBasketExecutionTier'
import type { DriftStatusLevel } from '@/utils/portfolioDrift'

interface BasketCardProps {
  basket: Basket
  onPreviewBuy?: (basket: Basket) => void
  onPreviewSell?: (basket: Basket) => void
  onPreviewRebalance?: (basket: Basket) => void
  onBuy?: (basket: Basket) => void
  onPlannedChainSelect?: (basket: Basket) => void
  isOwned?: boolean
  /** Sepolia testnet: show sell when wallet holds basket tokens on-chain */
  canPreviewSell?: boolean
  canRebalance?: boolean
  driftStatus?: DriftStatusLevel
  loading?: boolean
  isSelected?: boolean
}

export function BasketCard({
  basket,
  onPreviewBuy,
  onPreviewSell,
  onPreviewRebalance,
  onBuy,
  onPlannedChainSelect,
  isOwned,
  canPreviewSell,
  canRebalance,
  driftStatus,
  loading,
  isSelected,
}: BasketCardProps) {
  const tokenCount = basket.allocations.length
  const sepoliaTier = ENABLE_TESTNET_MODE ? getSepoliaBasketExecutionTier(basket) : null
  const quotesAvailable = canShowBasketQuotes(basket)
  const isTemplate = basket.templateOnly === true || sepoliaTier === 'template'
  const plannedMessage = isTemplate
    ? SPORT_FAN_ROUTING_MESSAGE
    : getPlannedChainMessage(basket)
  const tierNotice =
    sepoliaTier === 'stub'
      ? SEPOLIA_STUB_NOTICE
      : sepoliaTier === 'template'
        ? SEPOLIA_TEMPLATE_NOTICE
        : null

  const showSellButton = Boolean(onPreviewSell && (canPreviewSell || isOwned))
  const showRebalanceButton = Boolean(
    onPreviewRebalance && (canRebalance ?? (isOwned || canPreviewSell)),
  )

  const buyLabel = ENABLE_TESTNET_MODE ? 'Buy Portfolio' : BUTTON_LABELS.previewQuote
  const sellLabel = ENABLE_TESTNET_MODE ? 'Sell Portfolio' : BUTTON_LABELS.previewSellQuote

  return (
    <div
      className={`card-glow flex flex-col h-full min-w-0 hover:border-portx-green/30 transition-colors ${
        isSelected ? 'border-portx-green/50 shadow-glow' : ''
      } ${isOwned ? 'border-portx-green/25' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">{basket.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="badge">{basket.tag}</span>
            {basket.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="badge-blue text-[10px]">
                {tag}
              </span>
            ))}
            <BasketChainBadgeOrSepoliaTier
              basket={basket}
              sepoliaTier={sepoliaTier}
            />
            {isOwned && driftStatus && <PortfolioDriftBadge status={driftStatus} />}
            {isOwned && !driftStatus && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-portx-green">
                Owned
              </span>
            )}
          </div>
        </div>
        {basket.isCustom && <span className="badge-blue text-[10px] shrink-0">Custom</span>}
        {isTemplate && <span className="badge text-[10px] shrink-0">Template</span>}
      </div>

      <p className="text-sm text-portx-muted mb-4 flex-grow">{basket.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {basket.allocations.map(({ token, weightPercent }) => (
          <span
            key={token.symbol}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-portx-surface border border-portx-border font-mono"
          >
            <TokenLogo symbol={token.symbol} logoUrl={token.logoUrl} />
            {token.symbol} {weightPercent}%
          </span>
        ))}
      </div>

      <div className="text-sm text-portx-muted mb-4">
        {tokenCount} tokens
        {ENABLE_TESTNET_MODE && sepoliaTier
          ? ` · ${getSepoliaBasketTierLabel(sepoliaTier)}`
          : ENABLE_TESTNET_MODE
            ? isTemplate
              ? ' · Preview template'
              : isOwned
                ? ' · In your wallet'
                : ''
            : ` · Demo TVL ${formatUsd(basket.totalValueUsd ?? 0, true)}`}
      </div>

      {(tierNotice || (!quotesAvailable && !ENABLE_TESTNET_MODE)) && (
        <div className="mb-4 p-3 rounded-xl border border-portx-warning/40 bg-portx-warning/10 text-xs text-portx-warning leading-relaxed">
          {tierNotice ?? plannedMessage}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-auto">
        {onPreviewBuy && (
          <button
            type="button"
            onClick={() =>
              quotesAvailable ? onPreviewBuy(basket) : onPlannedChainSelect?.(basket)
            }
            disabled={quotesAvailable && loading}
            aria-busy={quotesAvailable && loading}
            aria-disabled={quotesAvailable && loading}
            title={
              quotesAvailable
                ? buyLabel
                : sepoliaTier === 'stub'
                  ? SEPOLIA_STUB_BUTTON_LABEL
                  : plannedMessage
            }
            className={
              quotesAvailable
                ? 'btn-primary w-full text-sm py-2.5 disabled:opacity-50'
                : 'btn-secondary w-full text-sm py-2.5 opacity-80 cursor-not-allowed'
            }
          >
            {loading && quotesAvailable
              ? BUTTON_LABELS.fetchingQuotes
              : quotesAvailable
                ? buyLabel
                : sepoliaTier === 'stub'
                  ? SEPOLIA_STUB_BUTTON_LABEL
                  : isTemplate
                    ? 'Coming soon'
                    : BUTTON_LABELS.quotesUnavailable}
          </button>
        )}
        {showSellButton && (
          <button
            type="button"
            onClick={() =>
              quotesAvailable ? onPreviewSell!(basket) : onPlannedChainSelect?.(basket)
            }
            disabled={quotesAvailable && loading}
            aria-busy={quotesAvailable && loading}
            title={quotesAvailable ? sellLabel : plannedMessage}
            className="btn-secondary w-full text-sm py-2.5 disabled:opacity-50"
          >
            {loading && quotesAvailable
              ? BUTTON_LABELS.fetchingQuotes
              : quotesAvailable
                ? sellLabel
                : BUTTON_LABELS.quotesUnavailable}
          </button>
        )}
        {showRebalanceButton && (
          <button
            type="button"
            onClick={() => onPreviewRebalance!(basket)}
            className="btn-secondary w-full text-sm py-2.5 border-portx-blue/40 text-portx-blue hover:border-portx-blue/60"
          >
            {ENABLE_TESTNET_MODE ? 'Preview Rebalance' : 'Rebalance'}
          </button>
        )}
        {onBuy && !ENABLE_TESTNET_MODE && (
          <button
            type="button"
            onClick={() => (quotesAvailable ? onBuy(basket) : onPlannedChainSelect?.(basket))}
            disabled={quotesAvailable && loading}
            title={quotesAvailable ? undefined : plannedMessage}
            className="btn-secondary w-full text-sm py-2.5 disabled:opacity-50"
          >
            Quick Buy (Demo)
          </button>
        )}
      </div>
    </div>
  )
}

function BasketChainBadgeOrSepoliaTier({
  basket,
  sepoliaTier,
}: {
  basket: Basket
  sepoliaTier: ReturnType<typeof getSepoliaBasketExecutionTier> | null
}) {
  if (ENABLE_TESTNET_MODE && sepoliaTier) {
    return (
      <StatusBadge
        variant={sepoliaTier === 'executable' ? 'live-quote' : 'planned'}
        label={getSepoliaBasketTierLabel(sepoliaTier)}
        size="sm"
      />
    )
  }

  return (
    <BasketChainBadge chainLabel={basket.chainLabel} chainStatus={basket.chainStatus} />
  )
}
