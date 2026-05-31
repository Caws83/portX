import type { LegQuote } from '@/types/quote'
import { formatUsd, formatTokenAmount } from '@/utils/format'
import { RouteProviderBadge } from './RouteProviderBadge'

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
                      ? `${formatUsd(leg.allocation.inputAmountUsd)} in`
                      : `${formatTokenAmount(parseFloat(q.inputAmount) / Math.pow(10, q.inputToken.decimals))} ${q.inputToken.symbol}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:text-right">
                <div>
                  <div className="font-mono text-sm text-portx-green">
                    {formatTokenAmount(parseFloat(q.outputAmount))} {q.outputToken.symbol}
                  </div>
                  <div className="text-xs text-portx-muted">≈ {formatUsd(q.outputAmountUsd)}</div>
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
