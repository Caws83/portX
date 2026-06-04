import type { BasketQuotePreview } from '@/types/quote'
import { formatUsd } from '@/utils/format'
import { formatSlippage, isHighSlippage } from '@/utils/slippage'
import { buildLiveExecutionSummaryFromPreview } from '@/services/transactionBuilder'
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
  const execution = buildLiveExecutionSummaryFromPreview(preview)
  const hasUnsupportedLegs = preview.legs.some((l) => l.bestQuote.provider === 'unsupported')
  const unsupportedWarnings = preview.legs.flatMap((l) =>
    l.bestQuote.provider === 'unsupported' ? l.bestQuote.warnings : []
  )
  const showLivePrep = !preview.isDemo && execution.hasZeroExRoute && !hasUnsupportedLegs
  const statusTone =
    execution.status === 'ready_for_wallet'
      ? 'border-portx-green/40 bg-portx-green/10 text-portx-green'
      : 'border-portx-warning/40 bg-portx-warning/10 text-portx-warning'

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

      {showLivePrep && (
        <div className={`rounded-xl border p-4 space-y-3 ${statusTone}`}>
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold opacity-80 mb-1">
              Wallet execution prep
            </p>
            <p className="font-bold">{execution.statusLabel}</p>
          </div>
          <p className="text-xs opacity-90">
            Live execution coming soon — review 0x router and calldata before signing (disabled in v1).
          </p>
          <div className="space-y-2">
            {execution.legs
              .filter((leg) => leg.provider === '0x')
              .slice(0, 3)
              .map((leg) => (
                <div
                  key={leg.index}
                  className="text-xs font-mono bg-black/20 rounded-lg px-3 py-2 space-y-1"
                >
                  <p>
                    {leg.inputSymbol} → {leg.outputSymbol}: router {leg.routerDisplay}
                  </p>
                  <p>
                    Calldata:{' '}
                    {leg.calldataStatus === 'available'
                      ? `${leg.calldataDisplay} · ready`
                      : leg.calldataStatus === 'demo'
                        ? 'demo placeholder'
                        : leg.calldataStatus === 'unsupported'
                          ? 'unsupported'
                          : 'missing'}
                  </p>
                </div>
              ))}
            {execution.legs.filter((l) => l.provider === '0x').length > 3 && (
              <p className="text-xs opacity-75">
                +{execution.legs.filter((l) => l.provider === '0x').length - 3} more 0x leg(s) in
                review modal
              </p>
            )}
          </div>
        </div>
      )}

      {preview.type === 'buy' && (
        <div className="p-3 rounded-xl bg-portx-surface border border-portx-border text-sm">
          <span className="text-portx-muted">Input: </span>
          <span className="font-mono font-semibold text-portx-green">
            {formatUsd(preview.totalInputUsd)} USDC
          </span>
        </div>
      )}

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

      {hasUnsupportedLegs && (
        <ExecutionWarning
          variant="info"
          warnings={
            unsupportedWarnings.length > 0
              ? unsupportedWarnings
              : ['One or more tokens are unsupported on Ethereum mainnet.']
          }
        />
      )}

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

      {showLivePrep && (
        <button
          type="button"
          disabled
          title="Live wallet execution is not enabled in v1 preview"
          className="btn-secondary w-full py-3 opacity-50 cursor-not-allowed"
        >
          Execute disabled in v1 preview
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
