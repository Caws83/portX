import type { BasketQuotePreview } from '@/types/quote'
import { formatUsd } from '@/utils/format'
import { formatSlippage, isHighSlippage } from '@/utils/slippage'
import { AllocationBreakdown } from './AllocationBreakdown'
import { ExecutionWarning } from './ExecutionWarning'
import { RouteProviderBadge } from './RouteProviderBadge'

interface QuotePreviewCardProps {
  preview: BasketQuotePreview
  onReview?: () => void
  reviewLabel?: string
  loading?: boolean
}

const TYPE_LABELS = {
  buy: 'Buy Basket Quote',
  sell_basket: 'Sell Basket Quote',
  sell_all: 'Sell All Portfolio Quote',
}

export function QuotePreviewCard({
  preview,
  onReview,
  reviewLabel = 'Review & Execute',
  loading,
}: QuotePreviewCardProps) {
  const direction = preview.type === 'buy' ? 'buy' : 'sell'
  const highSlippage = isHighSlippage(preview.slippageBps)

  return (
    <div className="card-glow space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{TYPE_LABELS[preview.type]}</h3>
          {preview.basketName && (
            <p className="text-sm text-portx-muted">{preview.basketName}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set(preview.legs.map((l) => l.bestQuote.provider))].map((p) => (
            <RouteProviderBadge key={p} provider={p} size="md" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Total In" value={formatUsd(preview.totalInputUsd)} />
        <Stat label="Est. Out" value={formatUsd(preview.totalOutputUsd)} highlight />
        <Stat label="Est. Gas" value={formatUsd(preview.totalGasUsd)} />
        <Stat label="Slippage" value={formatSlippage(preview.slippageBps)} warn={highSlippage} />
      </div>

      {highSlippage && (
        <ExecutionWarning
          variant="slippage"
          warnings={['High slippage tolerance — you may receive less than quoted.']}
        />
      )}

      <AllocationBreakdown legs={preview.legs} direction={direction} />

      <ExecutionWarning warnings={preview.warnings} />

      {onReview && (
        <button
          type="button"
          onClick={onReview}
          disabled={loading}
          className="btn-primary w-full py-3 disabled:opacity-50"
        >
          {loading ? 'Building...' : reviewLabel}
        </button>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
  warn,
}: {
  label: string
  value: string
  highlight?: boolean
  warn?: boolean
}) {
  return (
    <div className="p-3 rounded-xl bg-portx-surface border border-portx-border">
      <p className="text-xs text-portx-muted mb-1">{label}</p>
      <p
        className={`font-mono font-semibold text-sm ${
          warn ? 'text-portx-warning' : highlight ? 'text-portx-green' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}
