import { useState, type ReactNode } from 'react'

type ToastTone = 'info' | 'warning' | 'success'

const TONE_ICON_CLASSES: Record<ToastTone, string> = {
  info: 'text-sky-400',
  warning: 'text-amber-400',
  success: 'text-emerald-400',
}

interface FloatingToastProps {
  title: string
  message?: ReactNode
  tone?: ToastTone
  onSettings?: () => void
  dismissible?: boolean
  className?: string
}

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function GearIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function FloatingToast({
  title,
  message,
  tone = 'info',
  onSettings,
  dismissible = true,
  className = 'top-[7.5rem] right-4 lg:top-[5.5rem]',
}: FloatingToastProps) {
  const [open, setOpen] = useState(true)

  if (!open) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed z-50 max-w-sm rounded-xl border border-white/10 bg-zinc-900/80 p-4 shadow-xl backdrop-blur-md ${className}`}
    >
      <div className="flex items-start gap-3">
        <InfoIcon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE_ICON_CLASSES[tone]}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight text-zinc-100">{title}</p>
          {message && <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{message}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {onSettings && (
            <button
              type="button"
              onClick={onSettings}
              aria-label="Settings"
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
            >
              <GearIcon className="h-4 w-4" />
            </button>
          )}
          {dismissible && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Dismiss"
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
