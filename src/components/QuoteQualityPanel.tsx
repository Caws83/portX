import type { QuoteQualityAssessment } from '@/utils/quoteQuality'
import { formatUsd } from '@/utils/format'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ExecutionWarning } from './ExecutionWarning'

interface QuoteQualityPanelProps {
  quality: QuoteQualityAssessment
  /** Show routable vs unsupported leg counts */
  showLegCounts?: boolean
  /** Show excluded proceeds detail for sell previews */
  showProceedsDetail?: boolean
  totalOutputUsd?: number
  compact?: boolean
  /** Hide badge when shown elsewhere (e.g. preview card header) */
  hideBadge?: boolean
}

export function QuoteQualityBadge({ quality }: { quality: QuoteQualityAssessment }) {
  return <StatusBadge variant={quality.badgeVariant} label={quality.badgeLabel} size="md" />
}

export function QuoteQualityPanel({
  quality,
  showLegCounts = true,
  showProceedsDetail = false,
  totalOutputUsd,
  compact = false,
  hideBadge = false,
}: QuoteQualityPanelProps) {
  const { unsupportedLegCount, liveLegCount, proceedsExcludeUnsupported, excludedProceedsUsd } =
    quality

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-wrap items-center gap-2">
        {!hideBadge && <QuoteQualityBadge quality={quality} />}
        {showLegCounts && (
          <span className="text-xs text-portx-muted font-mono">
            {liveLegCount} live · {unsupportedLegCount} unsupported
          </span>
        )}
      </div>

      {!compact && (
        <p className="text-xs text-portx-muted">{quality.bannerMessage}</p>
      )}

      {unsupportedLegCount > 0 && (
        <div className="rounded-xl border border-portx-warning/40 bg-portx-warning/10 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-portx-warning">
            Unsupported legs ({unsupportedLegCount})
          </p>
          <ul className="text-sm space-y-1">
            {quality.unsupportedLegs.map((leg) => (
              <li key={leg.symbol} className="text-portx-muted">
                <span className="font-mono font-semibold text-white">{leg.symbol}</span>
                {leg.inputAmountUsd > 0 && (
                  <span className="text-xs ml-1">({formatUsd(leg.inputAmountUsd)} excluded)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showProceedsDetail && proceedsExcludeUnsupported && totalOutputUsd !== undefined && (
        <p className="text-xs text-portx-muted">
          Est. proceeds {formatUsd(totalOutputUsd)} USDC exclude{' '}
          {formatUsd(excludedProceedsUsd)} from {unsupportedLegCount} unsupported leg(s).
        </p>
      )}

      {quality.qualityWarnings.length > 0 && (
        <ExecutionWarning variant="warning" warnings={quality.qualityWarnings} />
      )}
    </div>
  )
}
