import { useState } from 'react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { BasketCard } from '@/components/BasketCard'
import { QuotePreviewCard } from '@/components/QuotePreviewCard'
import { TransactionReviewModal } from '@/components/TransactionReviewModal'
import { ExecutionWarning } from '@/components/ExecutionWarning'
import { useBasket } from '@/hooks/useBasket'
import { useQuotePreview } from '@/hooks/useQuotePreview'
import { executeDemoPlan } from '@/services/transactionBuilder'
import { DEFAULT_BUY_AMOUNT_USD } from '@/config/constants'
import type { Basket } from '@/types/basket'

export function Baskets() {
  const { allBaskets } = useBasket()
  const buyBasket = usePortfolioStore((s) => s.buyBasket)
  const sellBasket = usePortfolioStore((s) => s.sellBasket)
  const activeBaskets = usePortfolioStore((s) => s.activeBaskets)

  const {
    preview,
    plan,
    loading,
    error,
    previewBuy,
    previewSellBasket,
    buildPlan,
    clear,
  } = useQuotePreview()

  const [selectedBasket, setSelectedBasket] = useState<Basket | null>(null)
  const [buyAmount, setBuyAmount] = useState(DEFAULT_BUY_AMOUNT_USD)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [txMsg, setTxMsg] = useState<string | null>(null)

  const ownedIds = new Set(activeBaskets.map((b) => b.basketId))

  const handlePreviewBuy = async (basket: Basket) => {
    setSelectedBasket(basket)
    setTxMsg(null)
    await previewBuy(basket, buyAmount)
  }

  const handlePreviewSell = async (basket: Basket) => {
    setSelectedBasket(basket)
    setTxMsg(null)
    const purchase = activeBaskets.find((b) => b.basketId === basket.id)
    await previewSellBasket(basket, purchase?.amountUsd ?? 1000)
  }

  const handleReview = () => {
    if (!preview) return
    buildPlan(preview)
    setModalOpen(true)
  }

  const handleConfirm = async () => {
    if (!plan) return
    setConfirming(true)
    try {
      const result = await executeDemoPlan(plan)
      if (plan.type === 'buy' && plan.basketId) {
        buyBasket({
          basketId: plan.basketId,
          amountUsd: plan.totalInputUsd,
          purchasedAt: Date.now(),
          entryValueUsd: plan.totalInputUsd,
        })
      } else if (plan.type === 'sell_basket' && plan.basketId) {
        sellBasket(plan.basketId)
      }
      setTxMsg(result.message)
      setModalOpen(false)
      clear()
      setSelectedBasket(null)
    } finally {
      setConfirming(false)
    }
  }

  const handleQuickBuy = async (basket: Basket) => {
    setSelectedBasket(basket)
    const p = await previewBuy(basket, buyAmount)
    if (!p) return
    const execPlan = buildPlan(p)
    setModalOpen(true)
    void execPlan
  }

  const handleSell = async (basketId: string) => {
    setTxMsg(null)
    sellBasket(basketId)
    setTxMsg('Demo basket sold.')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="section-title">Crypto Baskets</h1>
        <p className="text-portx-muted mt-1">
          Preview routed quotes across 0x, 1inch, and Uniswap — then confirm demo execution.
        </p>
      </div>

      <ExecutionWarning variant="info" />

      <div className="mt-6 mb-8 card flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <label className="label" htmlFor="buy-amount">
            Basket buy amount (USDC)
          </label>
          <input
            id="buy-amount"
            type="number"
            min={100}
            step={100}
            value={buyAmount}
            onChange={(e) => setBuyAmount(parseFloat(e.target.value) || 0)}
            className="input-field max-w-xs font-mono"
          />
        </div>
        <p className="text-xs text-portx-muted sm:max-w-md">
          Example: ${buyAmount.toLocaleString()} USDC into a basket splits across allocation legs,
          each quoted independently with best-route selection.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-portx-danger/50 bg-portx-danger/10 text-sm text-portx-danger">
          {error}
        </div>
      )}

      {txMsg && (
        <div className="mb-6 p-4 rounded-xl border border-portx-green/30 bg-portx-green/10 text-sm text-portx-green">
          {txMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
          {allBaskets.map((basket) => (
            <BasketCard
              key={basket.id}
              basket={basket}
              onPreviewBuy={handlePreviewBuy}
              onPreviewSell={handlePreviewSell}
              onBuy={handleQuickBuy}
              onSell={handleSell}
              isOwned={ownedIds.has(basket.id)}
              loading={loading && selectedBasket?.id === basket.id}
              isSelected={selectedBasket?.id === basket.id && !!preview}
            />
          ))}
        </div>

        <div className="lg:col-span-1">
          {preview ? (
            <div className="sticky top-24">
              <QuotePreviewCard
                preview={preview}
                onReview={handleReview}
                loading={loading}
              />
              <button
                type="button"
                onClick={() => {
                  clear()
                  setSelectedBasket(null)
                }}
                className="btn-secondary w-full mt-3 text-sm"
              >
                Clear Preview
              </button>
            </div>
          ) : (
            <div className="card border-dashed text-center py-12">
              <p className="text-portx-muted text-sm">
                Select <span className="text-portx-green">Preview Buy Quote</span> on any basket to
                see allocation breakdown, best route per token, gas, and slippage.
              </p>
            </div>
          )}
        </div>
      </div>

      <TransactionReviewModal
        plan={plan}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        confirming={confirming}
      />
    </div>
  )
}
