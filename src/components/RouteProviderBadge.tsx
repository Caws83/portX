import type { QuoteProvider } from '@/types/route'
import { PROVIDER_LABELS } from '@/types/route'

interface RouteProviderBadgeProps {
  provider: QuoteProvider
  size?: 'sm' | 'md'
}

const COLORS: Record<QuoteProvider, string> = {
  '0x': 'bg-portx-green/10 text-portx-green border-portx-green/30',
  '1inch': 'bg-portx-blue/10 text-portx-blue border-portx-blue/30',
  uniswap: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  unsupported: 'bg-portx-warning/10 text-portx-warning border-portx-warning/30',
}

export function RouteProviderBadge({ provider, size = 'sm' }: RouteProviderBadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-mono font-medium border rounded-full ${
        COLORS[provider]
      } ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
    >
      {PROVIDER_LABELS[provider]}
    </span>
  )
}
