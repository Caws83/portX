import type { QuoteProvider } from '@/types/route'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface RouteProviderBadgeProps {
  provider: QuoteProvider
  size?: 'sm' | 'md'
}

const PROVIDER_VARIANT: Record<
  QuoteProvider,
  'live-quote' | 'fallback-quote' | 'unsupported' | 'demo'
> = {
  '0x': 'live-quote',
  '1inch': 'demo',
  uniswap: 'demo',
  unsupported: 'unsupported',
}

const PROVIDER_LABEL: Record<QuoteProvider, string> = {
  '0x': '0x',
  '1inch': '1inch',
  uniswap: 'Uniswap',
  unsupported: 'Unsupported',
}

export function RouteProviderBadge({ provider, size = 'sm' }: RouteProviderBadgeProps) {
  return (
    <StatusBadge
      variant={PROVIDER_VARIANT[provider]}
      label={PROVIDER_LABEL[provider]}
      size={size}
    />
  )
}
