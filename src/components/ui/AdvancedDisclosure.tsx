import { useState, type ReactNode } from 'react'

interface AdvancedDisclosureProps {
  title?: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

/** Collapsible panel for developer / diagnostic details */
export function AdvancedDisclosure({
  title = 'Advanced',
  children,
  defaultOpen = false,
  className = '',
}: AdvancedDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`rounded-xl border border-portx-border bg-portx-surface/50 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-portx-muted hover:text-white transition-colors"
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="text-xs font-mono shrink-0" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? <div className="px-4 pb-4 pt-0 space-y-3 border-t border-portx-border">{children}</div> : null}
    </div>
  )
}
