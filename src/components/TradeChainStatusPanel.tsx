import type { Basket } from '@/types/basket'
import type { ExecutionPlan } from '@/types/execution'
import { useRequiredTradeChain } from '@/hooks/useRequiredTradeChain'

interface TradeChainStatusPanelProps {
  plan?: ExecutionPlan | null
  selectedBasket?: Basket | null
  modalOpen?: boolean
  /** Compact row for navbar-adjacent contexts */
  compact?: boolean
  className?: string
}

export function TradeChainStatusPanel({
  plan,
  selectedBasket,
  modalOpen,
  compact = false,
  className = '',
}: TradeChainStatusPanelProps) {
  const {
    requiredChain,
    walletChainLabel,
    isConnected,
    isWrongChain,
    isSwitching,
    switchToRequiredChain,
  } = useRequiredTradeChain({ plan, selectedBasket, modalOpen })

  const tone = !isConnected
    ? 'border-portx-border bg-portx-surface text-portx-muted'
    : isWrongChain
      ? 'border-portx-warning/50 bg-portx-warning/10 text-portx-warning'
      : 'border-portx-green/30 bg-portx-green/10 text-portx-green'

  return (
    <div
      className={`rounded-xl border p-3 space-y-3 ${tone} ${className}`.trim()}
      data-testid="trade-chain-status"
    >
      <div className={`grid gap-3 ${compact ? 'grid-cols-1 text-xs' : 'grid-cols-2 text-sm'}`}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80 mb-0.5">
            Required chain
          </p>
          <p className="font-medium">{requiredChain.name}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80 mb-0.5">
            Current wallet chain
          </p>
          <p className="font-medium">{walletChainLabel}</p>
        </div>
      </div>

      {isWrongChain ? (
        <button
          type="button"
          onClick={switchToRequiredChain}
          disabled={isSwitching}
          className={`btn-primary w-full disabled:opacity-50 ${compact ? 'text-xs py-2' : 'text-sm py-2.5'}`}
        >
          {isSwitching ? 'Switching…' : `Switch to ${requiredChain.name}`}
        </button>
      ) : null}
    </div>
  )
}
