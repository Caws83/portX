import { formatUnits } from 'viem'
import type { LegQuote } from '@/types/quote'
import { formatUsd, formatTokenAmount } from '@/utils/format'
import { RouteProviderBadge } from './RouteProviderBadge'

function displayQuoteAmount(amount: string, decimals: number): string {
  if (amount.includes('.')) {
    return formatTokenAmount(Number.parseFloat(amount))
  }
  try {
    return formatTokenAmount(Number.parseFloat(formatUnits(BigInt(amount), decimals)))
  } catch {
    return formatTokenAmount(Number.parseFloat(amount))
  }
}

interface AllocationBreakdownProps {
  legs: LegQuote[]
  direction: 'buy' | 'sell'
}

export function AllocationBreakdown({ legs, direction }: AllocationBreakdownProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-portx-muted uppercase tracking-wide">
        {direction === 'buy' ? 'Allocation → Estimated Received' : 'Tokens Sold → USDC'}
      </h4>
      <div className="space-y-2">
        {legs.map((leg) => {
          const q = leg.bestQuote
          return (
            <div
              key={leg.allocation.token.symbol}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-portx-surface border border-portx-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-portx-green/20 to-portx-blue/20 flex items-center justify-center text-xs font-bold">
                  {leg.allocation.token.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {leg.allocation.token.symbol}{' '}
                    <span className="text-portx-muted font-normal">
                      ({leg.allocation.weightPercent}%)
                    </span>
                  </div>
                  <div className="text-xs text-portx-muted">
                    {direction === 'buy'
                      ? leg.allocation.inputAmountUsd > 0
                        ? `${formatUsd(leg.allocation.inputAmountUsd)} in`
                        : `${displayQuoteAmount(leg.allocation.inputAmount, q.inputToken.decimals)} ${q.inputToken.symbol} in`
                      : `${displayQuoteAmount(q.inputAmount, q.inputToken.decimals)} ${q.inputToken.symbol}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:text-right">
                <div>
                  <div className="font-mono text-sm text-portx-green">
                    {displayQuoteAmount(q.outputAmount, q.outputToken.decimals)} {q.outputToken.symbol}
                  </div>
                  <div className="text-xs text-portx-muted">≈ {formatUsd(q.outputAmountUsd)}</div>
                  {q.routeSummary.length > 0 && (
                    <div className="text-[10px] text-portx-muted mt-0.5 font-mono">
                      {q.routeSummary.join(' · ')}
                    </div>
                  )}
                </div>
                <RouteProviderBadge provider={q.provider} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
