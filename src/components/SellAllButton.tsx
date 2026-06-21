import { useState } from 'react'
import { executeSellAll } from '@/services/dexRouter'

interface SellAllButtonProps {
  onConfirm: () => void
  portfolioValueUsd: number
  disabled?: boolean
}

export function SellAllButton({ onConfirm, portfolioValueUsd, disabled }: SellAllButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSell = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    try {
      // SMART CONTRACT + DEX: executeSellAll routes full unwind
      await executeSellAll()
      onConfirm()
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  if (portfolioValueUsd <= 0) {
    return (
      <button type="button" disabled className="btn-danger w-full opacity-50 cursor-not-allowed">
        No positions to sell
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSell}
        disabled={disabled || loading}
        className={`w-full py-4 text-lg font-bold rounded-xl tracking-tight transition-all ${
          confirming
            ? 'text-white animate-pulse border border-rose-400/60 bg-gradient-to-b from-rose-600 to-rose-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_30px_-10px_rgba(244,63,94,0.55)]'
            : 'btn-danger'
        } disabled:opacity-50`}
      >
        {loading
          ? 'Processing demo sell...'
          : confirming
            ? 'Click again to confirm — Sell Entire Portfolio'
            : 'Sell Entire Portfolio'}
      </button>
      {confirming && (
        <p className="text-center text-sm text-portx-danger">
          This will close all demo positions. Live version uses on-chain batch sells.
        </p>
      )}
    </div>
  )
}
