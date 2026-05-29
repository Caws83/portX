import type { HeldToken } from '@/types/portfolio'
import { formatUsd, formatPercent, formatTokenAmount } from '@/utils/format'

interface TokenRowProps {
  holding: HeldToken
}

export function TokenRow({ holding }: TokenRowProps) {
  const { token, balance, valueUsd } = holding
  const change = token.change24h
  const trend = change >= 0 ? 'text-portx-green' : 'text-portx-danger'

  return (
    <div className="flex items-center justify-between py-4 border-b border-portx-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-portx-green/20 to-portx-blue/20 flex items-center justify-center font-bold text-sm">
          {token.symbol.slice(0, 2)}
        </div>
        <div>
          <div className="font-semibold">{token.symbol}</div>
          <div className="text-xs text-portx-muted">{token.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono font-medium">{formatTokenAmount(balance)}</div>
        <div className="text-sm text-portx-muted">{formatUsd(valueUsd)}</div>
      </div>
      <div className={`text-sm font-medium w-16 text-right ${trend}`}>
        {formatPercent(change)}
      </div>
    </div>
  )
}
