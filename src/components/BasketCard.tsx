import type { Basket } from '@/types/basket'
import { formatUsd } from '@/utils/format'

interface BasketCardProps {
  basket: Basket
  onPreviewBuy?: (basket: Basket) => void
  onPreviewSell?: (basket: Basket) => void
  onBuy?: (basket: Basket) => void
  onSell?: (basketId: string) => void
  isOwned?: boolean
  loading?: boolean
  isSelected?: boolean
}

export function BasketCard({
  basket,
  onPreviewBuy,
  onPreviewSell,
  onBuy,
  onSell,
  isOwned,
  loading,
  isSelected,
}: BasketCardProps) {
  const tokenCount = basket.allocations.length

  return (
    <div
      className={`card-glow flex flex-col h-full hover:border-portx-green/30 transition-colors ${
        isSelected ? 'border-portx-green/50 shadow-glow' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-lg font-bold">{basket.name}</h3>
          <span className="badge mt-1">{basket.tag}</span>
        </div>
        {basket.isCustom && <span className="badge-blue text-[10px]">Custom</span>}
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

      <div className="flex flex-col gap-2 mt-auto">
        {onPreviewBuy && (
          <button
            type="button"
            onClick={() => onPreviewBuy(basket)}
            disabled={loading}
            className="btn-primary w-full text-sm py-2.5 disabled:opacity-50"
          >
            {loading ? 'Fetching quotes...' : 'Preview Quote'}
          </button>
        )}
        {isOwned && onPreviewSell && (
          <button
            type="button"
            onClick={() => onPreviewSell(basket)}
            disabled={loading}
            className="btn-secondary w-full text-sm py-2.5 disabled:opacity-50"
          >
            Preview Sell Quote
          </button>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          {onBuy && (
            <button
              type="button"
              onClick={() => onBuy(basket)}
              disabled={loading}
              className="btn-secondary flex-1 text-sm py-2.5 disabled:opacity-50"
            >
              Quick Buy (Demo)
            </button>
          )}
          {isOwned && onSell && (
            <button
              type="button"
              onClick={() => onSell(basket.id)}
              className="btn-secondary flex-1 text-sm py-2.5"
            >
              Sell Basket
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
