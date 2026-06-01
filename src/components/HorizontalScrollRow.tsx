import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface HorizontalScrollRowProps {
  children: ReactNode
  className?: string
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-6 h-6"
      aria-hidden
    >
      {direction === 'left' ? (
        <path
          fillRule="evenodd"
          d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
          clipRule="evenodd"
        />
      )}
    </svg>
  )
}

function ScrollButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Scroll left' : 'Scroll right'}
      className="shrink-0 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border-2 border-portx-green/50 bg-portx-surface text-portx-green shadow-glow transition-all hover:border-portx-green hover:bg-portx-green/10 hover:scale-105 active:scale-95 disabled:border-portx-border disabled:bg-portx-card disabled:text-portx-muted disabled:shadow-none disabled:hover:scale-100"
    >
      <ChevronIcon direction={direction} />
    </button>
  )
}

export function HorizontalScrollRow({ children, className = '' }: HorizontalScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [overflows, setOverflows] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const { scrollLeft, scrollWidth, clientWidth } = el
    const hasOverflow = scrollWidth > clientWidth + 1
    setOverflows(hasOverflow)
    setCanScrollLeft(scrollLeft > 1)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })

    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
    }
  }, [updateScrollState, children])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return

    el.scrollBy({
      left: direction === 'left' ? -el.clientWidth * 0.85 : el.clientWidth * 0.85,
      behavior: 'smooth',
    })
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {overflows && (
        <ScrollButton direction="left" disabled={!canScrollLeft} onClick={() => scroll('left')} />
      )}

      <div
        ref={scrollRef}
        className={`min-w-0 flex-1 flex gap-4 overflow-x-auto overscroll-x-contain scrollbar-hide snap-x snap-mandatory ${className}`}
      >
        {children}
      </div>

      {overflows && (
        <ScrollButton direction="right" disabled={!canScrollRight} onClick={() => scroll('right')} />
      )}
    </div>
  )
}
