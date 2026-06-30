import type { Basket } from '@/types/basket'
import { TradeChainStatusPanel } from '@/components/TradeChainStatusPanel'
import { useRequiredTradeChain } from '@/hooks/useRequiredTradeChain'

interface TradeChainGateModalProps {
  open: boolean
  basket: Basket | null
  onClose: () => void
  onContinue: () => void
}

export function TradeChainGateModal({
  open,
  basket,
  onClose,
  onContinue,
}: TradeChainGateModalProps) {
  const { isCorrectChain, isConnected, requiredChain } = useRequiredTradeChain({
    selectedBasket: basket,
  })

  if (!open || !basket) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-md card-glow border-portx-warning/30">
        <h2 className="text-lg font-bold mb-1">Switch network to trade</h2>
        <p className="text-sm text-portx-muted mb-4">
          {basket.name} must be previewed and executed on {requiredChain.name}.
        </p>

        <TradeChainStatusPanel selectedBasket={basket} className="mb-4" />

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!isConnected || !isCorrectChain}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
