import type { ReactNode } from 'react'
import { BUTTON_LABELS } from '@/config/uiCopy'

export type StatusBannerVariant = 'loading' | 'success' | 'warning' | 'error' | 'info'

const VARIANT_CLASSES: Record<StatusBannerVariant, string> = {
  loading: 'border-portx-border bg-portx-surface text-portx-muted',
  success: 'border-portx-green/30 bg-portx-green/10 text-portx-green',
  warning: 'border-portx-warning/50 bg-portx-warning/10 text-portx-warning',
  error: 'border-portx-danger/50 bg-portx-danger/10 text-portx-danger',
  info: 'border-portx-blue/30 bg-portx-blue/10 text-portx-blue',
}

interface StatusBannerProps {
  variant: StatusBannerVariant
  children: ReactNode
  onRetry?: () => void
  className?: string
  compact?: boolean
}

export function StatusBanner({
  variant,
  children,
  onRetry,
  className = '',
  compact = false,
}: StatusBannerProps) {
  const isLoading = variant === 'loading'

  return (
    <div
      role="status"
      aria-live={isLoading ? 'polite' : undefined}
      aria-busy={isLoading || undefined}
      className={`rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
        compact ? 'p-3 text-xs' : 'p-4 text-sm'
      } ${VARIANT_CLASSES[variant]} ${className}`}
    >
      <span>{children}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary text-sm py-2 px-4 shrink-0"
          aria-label={BUTTON_LABELS.retryApi}
        >
          {BUTTON_LABELS.retryApi}
        </button>
      )}
    </div>
  )
}
