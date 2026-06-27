import { ENABLE_DEMO_QUOTES } from '@/config/constants'

interface ExecutionWarningProps {
  warnings?: string[]
  variant?: 'info' | 'demo' | 'testnet' | 'slippage' | 'warning' | 'error'
  /** Override default section title for demo/testnet variants */
  title?: string
}

export function ExecutionWarning({
  warnings = [],
  variant = 'demo',
  title,
}: ExecutionWarningProps) {
  const base =
    variant === 'slippage' || variant === 'warning'
      ? 'border-portx-warning/50 bg-portx-warning/10 text-portx-warning'
      : variant === 'error'
        ? 'border-portx-danger/50 bg-portx-danger/10 text-portx-danger'
        : variant === 'info' || variant === 'testnet'
          ? 'border-portx-blue/30 bg-portx-blue/5 text-portx-blue'
          : 'border-portx-green/30 bg-portx-green/5 text-portx-muted'

  const defaultMessage = ENABLE_DEMO_QUOTES
    ? 'Demo mode — quotes are simulated. Real swap execution is not live yet. API keys for 0x / 1inch route through the PortX backend when enabled.'
    : 'Connecting to PortX quote backend. Ensure VITE_PORTX_API_URL is configured.'

  const items = warnings.length > 0 ? warnings : [defaultMessage]

  return (
    <div className={`rounded-xl border p-4 text-sm space-y-2 ${base}`}>
      {variant === 'demo' && (
        <p className="font-semibold text-portx-green text-xs uppercase tracking-wide">
          {title ?? 'Demo / Coming Soon'}
        </p>
      )}
      {variant === 'testnet' && (
        <p className="font-semibold text-portx-green text-xs uppercase tracking-wide">
          {title ?? 'Sepolia Testnet Trade'}
        </p>
      )}
      {items.map((w) => (
        <p key={w}>{w}</p>
      ))}
    </div>
  )
}
