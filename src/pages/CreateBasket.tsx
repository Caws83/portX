import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEMO_TOKENS } from '@/data/tokens'
import { useBasketStore } from '@/store/basketStore'
import type { TokenAllocation } from '@/types/token'
import type { Basket } from '@/types/basket'
import { isValidAllocationTotal } from '@/utils/validation'
import { sum } from '@/utils/math'

export function CreateBasket() {
  const navigate = useNavigate()
  const addCustomBasket = useBasketStore((s) => s.addCustomBasket)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Record<string, number>>({
    ETH: 40,
    BTC: 30,
    SOL: 30,
  })

  const toggleToken = (symbol: string) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (symbol in next) {
        delete next[symbol]
      } else {
        next[symbol] = 0
      }
      return next
    })
  }

  const setWeight = (symbol: string, weight: number) => {
    setSelected((prev) => ({ ...prev, [symbol]: weight }))
  }

  const weights = Object.values(selected)
  const totalWeight = sum(weights)
  const valid = name.trim().length > 0 && isValidAllocationTotal(weights) && Object.keys(selected).length > 0

  const handleSave = () => {
    if (!valid) return

    const allocations: TokenAllocation[] = Object.entries(selected).map(([symbol, weightPercent]) => ({
      token: DEMO_TOKENS.find((t) => t.symbol === symbol)!,
      weightPercent,
    }))

    const basket: Basket = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Custom user basket',
      tag: 'Custom',
      allocations,
      isCustom: true,
    }

    // Persist to Zustand — on-chain basket registry will replace local storage later
    addCustomBasket(basket)
    navigate('/baskets')
  }

  const autoBalance = () => {
    const symbols = Object.keys(selected)
    if (symbols.length === 0) return
    const even = Math.floor(100 / symbols.length)
    const remainder = 100 - even * symbols.length
    const next: Record<string, number> = {}
    symbols.forEach((s, i) => {
      next[s] = even + (i === 0 ? remainder : 0)
    })
    setSelected(next)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="section-title mb-2">Create Basket</h1>
      <p className="text-portx-muted mb-8">
        Select tokens and set allocation percentages. Saved to local state (demo).
      </p>

      <div className="card space-y-6 mb-8">
        <div>
          <label className="label" htmlFor="basket-name">
            Basket name
          </label>
          <input
            id="basket-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="My Growth Basket"
          />
        </div>
        <div>
          <label className="label" htmlFor="basket-desc">
            Description
          </label>
          <textarea
            id="basket-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field min-h-[80px]"
            placeholder="Optional description"
          />
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Token allocation</h2>
          <button type="button" onClick={autoBalance} className="text-sm text-portx-green hover:underline">
            Auto-balance 100%
          </button>
        </div>
        <p className={`text-sm mb-4 ${totalWeight === 100 ? 'text-portx-green' : 'text-portx-danger'}`}>
          Total: {totalWeight.toFixed(1)}% {totalWeight === 100 ? '✓' : '(must equal 100%)'}
        </p>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {DEMO_TOKENS.map((token) => {
            const isOn = token.symbol in selected
            return (
              <div
                key={token.symbol}
                className={`flex items-center gap-4 p-3 rounded-xl border ${
                  isOn ? 'border-portx-green/30 bg-portx-green/5' : 'border-portx-border'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggleToken(token.symbol)}
                  className="w-4 h-4 accent-portx-green"
                />
                <div className="flex-1 font-medium">{token.symbol}</div>
                {isOn && (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={selected[token.symbol]}
                    onChange={(e) => setWeight(token.symbol, parseFloat(e.target.value) || 0)}
                    className="input-field w-24 text-right font-mono"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <button type="button" onClick={handleSave} disabled={!valid} className="btn-primary w-full py-4 disabled:opacity-40">
        Save Basket
      </button>
    </div>
  )
}
