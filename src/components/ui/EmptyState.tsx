import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`card border-dashed text-center py-10 px-4 sm:py-12 ${className}`}
      role="status"
    >
      <p className="font-semibold text-white mb-2">{title}</p>
      <p className="text-sm text-portx-muted max-w-md mx-auto">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
