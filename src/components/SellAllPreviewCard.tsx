import { useMemo } from 'react'
import type { BasketQuotePreview } from '@/types/quote'
import { BUTTON_LABELS } from '@/config/uiCopy'
import { formatUsd } from '@/utils/format'
import { formatSlippage, isHighSlippage } from '@/utils/slippage'
import { assessQuoteQuality } from '@/utils/quoteQuality'
import { AllocationBreakdown } from './AllocationBreakdown'
import { ExecutionWarning } from './ExecutionWarning'
import { RouteProviderBadge } from './RouteProviderBadge'
import { QuoteQualityBadge, QuoteQualityPanel } from './QuoteQualityPanel'

interface SellAllPreviewCardProps {
  preview: BasketQuotePreview
  quoteSource?: 'api' | 'fallback' | null
  onReview?: () => void
  reviewLabel?: string
  loading?: boolean
}

export function SellAllPreviewCard({
  preview,
  quoteSource,
  onReview,
  reviewLabel = BUTTON_LABELS.reviewDemoSell,
  loading,
}: SellAllPreviewCardProps) {
  const highSlippage = isHighSlippage(preview.slippageBps)
  const destination = preview.legs[0]?.bestQuote.outputToken.symbol ?? 'USDC'
  const quality = useMemo(
    () => assessQuoteQuality(preview, quoteSource ?? null),
    [preview, quoteSource]
  )

  return (
    <div className="card-glow space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">Sell All Portfolio Quote</h3>
          {preview.basketName && (
            <p className="text-sm text-portx-muted truncate">{preview.basketName}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <QuoteQualityBadge quality={quality} />
          {[...new Set(preview.legs.map((l) => l.bestQuote.provider))].map((p) => (
            <RouteProviderBadge key={p} provider={p} size="md" />
          ))}
        </div>
      </div>

      <QuoteQualityPanel
        quality={quality}
        showLegCounts
        showProceedsDetail
        totalOutputUsd={preview.totalOutputUsd}
        compact
        hideBadge
      />

      <div className="p-3 rounded-xl bg-portx-surface border border-portx-border text-sm space-y-2">
        <div>
          <span className="text-portx-muted">Tokens sold: </span>
          <span className="font-mono font-semibold">
            {preview.legs.map((l) => l.allocation.token.symbol).join(', ')}
          </span>
        </div>
        <div>
          <span className="text-portx-muted">Destination: </span>
          <span className="font-mono font-semibold text-portx-green">{destination}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Portfolio In" value={formatUsd(preview.totalInputUsd)} />
        <Stat label="Est. Received" value={formatUsd(preview.totalOutputUsd)} highlight />
        <Stat label="Est. Gas" value={formatUsd(preview.totalGasUsd)} />
        <Stat label="Slippage" value={formatSlippage(preview.slippageBps)} warn={highSlippage} />
      </div>

      {highSlippage && (
        <ExecutionWarning
          variant="slippage"
          warnings={['High slippage tolerance — you may receive less than quoted.']}
        />
      )}

      <AllocationBreakdown legs={preview.legs} direction="sell" />

      <ExecutionWarning warnings={preview.warnings} />

      {onReview && (
        <button
          type="button"
          onClick={onReview}
          disabled={loading}
          aria-busy={loading}
          className="btn-primary w-full py-3 disabled:opacity-50"
        >
          {loading ? BUTTON_LABELS.buildingReview : reviewLabel}
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
