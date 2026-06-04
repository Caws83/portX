export type StatusBadgeVariant =
  | 'active'
  | 'planned'
  | 'unsupported'
  | 'live-quote'
  | 'fallback-quote'
  | 'demo'

const VARIANT_CLASSES: Record<StatusBadgeVariant, string> = {
  active: 'badge',
  planned: 'badge-blue',
  unsupported: 'inline-flex items-center font-mono font-medium border rounded-full text-[10px] px-2 py-0.5 bg-portx-warning/10 text-portx-warning border-portx-warning/30',
  'live-quote':
    'inline-flex items-center font-mono font-medium border rounded-full text-[10px] px-2 py-0.5 bg-portx-green/10 text-portx-green border-portx-green/30',
  'fallback-quote':
    'inline-flex items-center font-mono font-medium border rounded-full text-[10px] px-2 py-0.5 bg-portx-warning/10 text-portx-warning border-portx-warning/30',
  demo: 'badge-blue',
}

const VARIANT_LABELS: Record<StatusBadgeVariant, string> = {
  active: 'Active',
  planned: 'Planned',
  unsupported: 'Unsupported',
  'live-quote': 'Live Quote',
  'fallback-quote': 'Fallback Quote',
  demo: 'Demo',
}

interface StatusBadgeProps {
  variant: StatusBadgeVariant
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({ variant, label, size = 'sm', className = '' }: StatusBadgeProps) {
  const text = label ?? VARIANT_LABELS[variant]
  const sizeClass = size === 'md' ? 'text-xs px-2.5 py-1' : ''

  return (
    <span className={`${VARIANT_CLASSES[variant]} ${sizeClass} shrink-0 ${className}`.trim()}>
      {text}
    </span>
  )
}
