import { useEffect, useMemo, useState } from 'react'
import type { Basket } from '@/types/basket'
import {
  formatTestnetEthNotional,
  splitUsdAcrossAllocations,
  TESTNET_BUY_AMOUNT_MIN_USD,
  TESTNET_BUY_AMOUNT_PRESETS_USD,
} from '@/utils/testnetBuyAmount'
import { TESTNET_WETH_PRICE_USD } from '@/services/testnetPortfolioPricing'
import { formatUsd } from '@/utils/format'

interface BuyAmountSelectorModalProps {
  open: boolean
  basket: Basket | null
  initialAmountUsd: number
  loading?: boolean
  onClose: () => void
  onConfirm: (amountUsd: number) => void
}

export function BuyAmountSelectorModal({
  open,
  basket,
  initialAmountUsd,
  loading = false,
  onClose,
  onConfirm,
}: BuyAmountSelectorModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(
    TESTNET_BUY_AMOUNT_PRESETS_USD.includes(initialAmountUsd as (typeof TESTNET_BUY_AMOUNT_PRESETS_USD)[number])
      ? initialAmountUsd
      : 'custom',
  )
  const [customAmountUsd, setCustomAmountUsd] = useState(
    initialAmountUsd >= TESTNET_BUY_AMOUNT_MIN_USD ? String(initialAmountUsd) : '100',
  )

  useEffect(() => {
    if (!open) return
    const presetMatch = TESTNET_BUY_AMOUNT_PRESETS_USD.find((preset) => preset === initialAmountUsd)
    if (presetMatch) {
      setSelectedPreset(presetMatch)
    } else {
      setSelectedPreset('custom')
      setCustomAmountUsd(String(Math.max(initialAmountUsd, TESTNET_BUY_AMOUNT_MIN_USD)))
    }
  }, [open, initialAmountUsd])

  const amountUsd = useMemo(() => {
    if (selectedPreset !== 'custom') return selectedPreset
    const parsed = Number.parseFloat(customAmountUsd)
    return Number.isFinite(parsed) ? parsed : 0
  }, [selectedPreset, customAmountUsd])

  const allocationPreview = useMemo(() => {
    if (!basket || amountUsd <= 0) return []
    return splitUsdAcrossAllocations(amountUsd, basket.allocations)
  }, [basket, amountUsd])

  const canConfirm =
    amountUsd >= TESTNET_BUY_AMOUNT_MIN_USD && !loading && basket !== null

  if (!open || !basket) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buy-amount-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto card-glow border-portx-green/20 shadow-glow p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted mb-1">
              Step 1 — Choose amount
            </p>
            <h2 id="buy-amount-title" className="text-xl font-bold">
              Buy amount
            </h2>
            <p className="text-sm text-portx-muted mt-1">{basket.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-portx-muted hover:text-white text-2xl leading-none shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-portx-muted mb-4">
          Select how much to invest. PortX splits your amount across basket allocations automatically.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {TESTNET_BUY_AMOUNT_PRESETS_USD.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={loading}
              onClick={() => setSelectedPreset(preset)}
              className={`rounded-lg border px-3 py-3 text-left transition-colors disabled:opacity-50 ${
                selectedPreset === preset
                  ? 'border-portx-green bg-portx-green/10 text-portx-green'
                  : 'border-portx-border bg-black/20 hover:border-portx-green/40'
              }`}
            >
              <span className="block font-bold">${preset.toLocaleString()}</span>
              <span className="block text-xs text-portx-muted mt-0.5">
                {formatTestnetEthNotional(preset)} notional
              </span>
            </button>
          ))}
        </div>

        <label className="flex items-start gap-2 mb-3 cursor-pointer">
          <input
            type="radio"
            name="buy-amount-mode"
            className="mt-1"
            checked={selectedPreset === 'custom'}
            onChange={() => setSelectedPreset('custom')}
            disabled={loading}
          />
          <span className="text-sm font-medium">Custom amount</span>
        </label>

        {selectedPreset === 'custom' ? (
          <div className="mb-4">
            <label className="label" htmlFor="custom-buy-amount">
              Amount (USD)
            </label>
            <input
              id="custom-buy-amount"
              type="number"
              min={TESTNET_BUY_AMOUNT_MIN_USD}
              step={50}
              value={customAmountUsd}
              onChange={(event) => setCustomAmountUsd(event.target.value)}
              disabled={loading}
              className="input-field max-w-xs font-mono w-full"
            />
          </div>
        ) : null}

        {allocationPreview.length > 0 ? (
          <div className="rounded-xl border border-portx-border bg-black/20 p-3 mb-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
              Allocation preview
            </p>
            <ul className="space-y-1 text-sm">
              {allocationPreview.map((row) => (
                <li key={row.symbol} className="flex justify-between gap-2">
                  <span>
                    {row.symbol}{' '}
                    <span className="text-portx-muted">({row.weightPercent}%)</span>
                  </span>
                  <span className="font-mono">{formatUsd(row.usd)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-portx-muted pt-1 border-t border-portx-border">
              Sepolia notional: {formatTestnetEthNotional(amountUsd)} · reference price $
              {TESTNET_WETH_PRICE_USD.toLocaleString()}/ETH
            </p>
          </div>
        ) : null}

        {amountUsd > 0 && amountUsd < TESTNET_BUY_AMOUNT_MIN_USD ? (
          <p className="text-xs text-portx-warning mb-4">
            Minimum buy amount is ${TESTNET_BUY_AMOUNT_MIN_USD}.
          </p>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm(amountUsd)}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? 'Loading quote…' : 'Continue to review'}
          </button>
        </div>
      </div>
    </div>
  )
}
