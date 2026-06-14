import type { Basket } from '@/types/basket'
import { BasketChainBadge } from '@/components/BasketChainBadge'
import { formatUsd } from '@/utils/format'
import { BUTTON_LABELS } from '@/config/uiCopy'
import { canPreviewQuoteForBasket, getPlannedChainMessage } from '@/utils/chainRouting'

interface BasketCardProps {
  basket: Basket
  onPreviewBuy?: (basket: Basket) => void
  onPreviewSell?: (basket: Basket) => void
  onBuy?: (basket: Basket) => void
  onPlannedChainSelect?: (basket: Basket) => void
  isOwned?: boolean
  loading?: boolean
  isSelected?: boolean
}

export function BasketCard({
  basket,
  onPreviewBuy,
  onPreviewSell,
  onBuy,
  onPlannedChainSelect,
  isOwned,
  loading,
  isSelected,
}: BasketCardProps) {
  const tokenCount = basket.allocations.length
  const quotesAvailable = canPreviewQuoteForBasket(basket)
  const plannedMessage = getPlannedChainMessage(basket)

  return (
    <div
      className={`card-glow flex flex-col h-full min-w-0 hover:border-portx-green/30 transition-colors ${
        isSelected ? 'border-portx-green/50 shadow-glow' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">{basket.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="badge">{basket.tag}</span>
            <BasketChainBadge chainLabel={basket.chainLabel} chainStatus={basket.chainStatus} />
          </div>
        </div>
        {basket.isCustom && <span className="badge-blue text-[10px] shrink-0">Custom</span>}
      </div>

      <p className="text-sm text-portx-muted mb-4 flex-grow">{basket.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {basket.allocations.map(({ token, weightPercent }) => (
          <span
            key={token.symbol}
            className="text-xs px-2 py-1 rounded-md bg-portx-surface border border-portx-border font-mono"
          >
            {token.symbol} {weightPercent}%
          </span>
        ))}
      </div>

      <div className="text-sm text-portx-muted mb-4">
        {tokenCount} tokens · Demo TVL {formatUsd(basket.totalValueUsd ?? 0, true)}
      </div>

      {!quotesAvailable && (
        <div className="mb-4 p-3 rounded-xl border border-portx-warning/40 bg-portx-warning/10 text-xs text-portx-warning leading-relaxed">
          {plannedMessage}
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
            title={quotesAvailable ? BUTTON_LABELS.previewQuote : plannedMessage}
            className={
              quotesAvailable
                ? 'btn-primary w-full text-sm py-2.5 disabled:opacity-50'
                : 'btn-secondary w-full text-sm py-2.5 opacity-80'
            }
          >
            {loading && quotesAvailable
              ? BUTTON_LABELS.fetchingQuotes
              : quotesAvailable
                ? BUTTON_LABELS.previewQuote
                : BUTTON_LABELS.quotesUnavailable}
          </button>
        )}
        {isOwned && onPreviewSell && (
          <button
            type="button"
            onClick={() =>
              quotesAvailable ? onPreviewSell(basket) : onPlannedChainSelect?.(basket)
            }
            disabled={quotesAvailable && loading}
            aria-busy={quotesAvailable && loading}
            title={quotesAvailable ? BUTTON_LABELS.previewSellQuote : plannedMessage}
            className="btn-secondary w-full text-sm py-2.5 disabled:opacity-50"
          >
            {loading && quotesAvailable
              ? BUTTON_LABELS.fetchingQuotes
              : quotesAvailable
                ? BUTTON_LABELS.previewSellQuote
                : BUTTON_LABELS.quotesUnavailable}
          </button>
        )}
        {onBuy && (
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
