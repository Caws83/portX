import { useState } from 'react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { BasketCard } from '@/components/BasketCard'
import { QuotePreviewCard } from '@/components/QuotePreviewCard'
import { TransactionReviewModal } from '@/components/TransactionReviewModal'
import { ExecutionWarning } from '@/components/ExecutionWarning'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { useBasket } from '@/hooks/useBasket'
import { useQuotePreview } from '@/hooks/useQuotePreview'
import { executeDemoPlan } from '@/services/transactionBuilder'
import { DEFAULT_BUY_AMOUNT_USD } from '@/config/constants'
import {
  BUTTON_LABELS,
  EMPTY_MESSAGES,
  ERROR_MESSAGES,
  INFO_MESSAGES,
  LOADING_MESSAGES,
  SUCCESS_MESSAGES,
  WARNING_MESSAGES,
} from '@/config/uiCopy'
import type { Basket } from '@/types/basket'
import { canPreviewQuoteForBasket, getPlannedChainMessage } from '@/utils/chainRouting'

export function Baskets() {
  const { allBaskets, basketsLoading, basketsError, basketsSource } = useBasket()
  const buyBasket = usePortfolioStore((s) => s.buyBasket)
  const sellBasket = usePortfolioStore((s) => s.sellBasket)
  const activeBaskets = usePortfolioStore((s) => s.activeBaskets)

  const {
    preview,
    plan,
    loading,
    error,
    quoteSource,
    previewBuy,
    retryBuyQuote,
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

  const selectPlannedBasket = (basket: Basket) => {
    clear()
    setModalOpen(false)
    setSelectedBasket(basket)
    setTxMsg(null)
  }

  const guardQuotePreview = (basket: Basket): boolean => {
    if (canPreviewQuoteForBasket(basket)) return true
    selectPlannedBasket(basket)
    return false
  }

  const handlePreviewBuy = async (basket: Basket) => {
    if (!guardQuotePreview(basket)) return
    setSelectedBasket(basket)
    setTxMsg(null)
    await previewBuy(basket, buyAmount)
  }

  const handlePreviewSell = async (basket: Basket) => {
    if (!guardQuotePreview(basket)) return
    setSelectedBasket(basket)
    setTxMsg(null)
    const purchase = activeBaskets.find((b) => b.basketId === basket.id)
    await previewSellBasket(basket, purchase?.amountUsd ?? 1000)
  }

  const handleReview = () => {
    if (!preview || !selectedBasket || !canPreviewQuoteForBasket(selectedBasket)) return
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
    if (!guardQuotePreview(basket)) return
    setSelectedBasket(basket)
    const p = await previewBuy(basket, buyAmount)
    if (!p) return
    buildPlan(p)
    setModalOpen(true)
  }

  const handleSell = async (basketId: string) => {
    setTxMsg(null)
    sellBasket(basketId)
    setTxMsg('Demo basket position removed.')
  }

  const clearSelection = () => {
    clear()
    setSelectedBasket(null)
    setModalOpen(false)
  }

  const showPlannedPanel =
    selectedBasket !== null && !canPreviewQuoteForBasket(selectedBasket)
  const showQuotePreview =
    preview !== null &&
    selectedBasket !== null &&
    canPreviewQuoteForBasket(selectedBasket)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="section-title">Crypto Baskets</h1>
        <p className="text-portx-muted mt-1">
          Preview routed quotes on Ethereum mainnet — planned chains show routing status only.
        </p>
      </div>

      <ExecutionWarning variant="info" warnings={[INFO_MESSAGES.demoMode]} />

      <div className="mt-6 mb-8 card flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1 min-w-0">
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
            className="input-field max-w-xs font-mono w-full"
            disabled={showPlannedPanel}
            aria-disabled={showPlannedPanel}
          />
        </div>
        <p className="text-xs text-portx-muted sm:max-w-md">
          Example: ${buyAmount.toLocaleString()} USDC into an Ethereum basket splits across
          allocation legs, each quoted independently. Planned-chain baskets do not request quotes.
        </p>
      </div>

      {basketsLoading && (
        <StatusBanner variant="loading" className="mb-6">
          {LOADING_MESSAGES.baskets}
        </StatusBanner>
      )}

      {basketsError && basketsSource === 'fallback' && !basketsLoading && (
        <StatusBanner variant="warning" className="mb-6">
          {WARNING_MESSAGES.apiOfflineFallback('basket')} ({basketsError})
        </StatusBanner>
      )}

      {basketsSource === 'api' && !basketsLoading && (
        <StatusBanner variant="success" className="mb-6" compact>
          {SUCCESS_MESSAGES.basketsApi}
        </StatusBanner>
      )}

      {loading && (
        <StatusBanner variant="loading" className="mb-6">
          {LOADING_MESSAGES.quotePreview}
        </StatusBanner>
      )}

      {quoteSource === 'fallback' && preview && !loading && (
        <StatusBanner variant="warning" className="mb-6" onRetry={() => void retryBuyQuote()}>
          {WARNING_MESSAGES.quoteFallback}
        </StatusBanner>
      )}

      {quoteSource === 'api' && preview && !loading && (
        <StatusBanner variant="success" className="mb-6" compact>
          {SUCCESS_MESSAGES.quoteApi}
        </StatusBanner>
      )}

      {quoteSource === 'testnet' && preview && !loading && (
        <StatusBanner variant="warning" className="mb-6" compact>
          Sepolia testnet quote — frontend Uniswap V3 only (no backend /quotes).
        </StatusBanner>
      )}

      {error && (
        <StatusBanner variant="error" className="mb-6">
          {error || ERROR_MESSAGES.quoteFailed}
        </StatusBanner>
      )}

      {txMsg && (
        <StatusBanner variant="success" className="mb-6">
          {txMsg}
        </StatusBanner>
      )}

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4 sm:gap-6 min-w-0">
          {!basketsLoading && allBaskets.length === 0 ? (
            <div className="sm:col-span-2">
              <EmptyState
                title={EMPTY_MESSAGES.noBaskets.title}
                description={EMPTY_MESSAGES.noBaskets.description}
              />
            </div>
          ) : (
            !basketsLoading &&
            allBaskets.map((basket) => (
              <BasketCard
                key={basket.id}
                basket={basket}
                onPreviewBuy={handlePreviewBuy}
                onPreviewSell={handlePreviewSell}
                onBuy={handleQuickBuy}
                onSell={handleSell}
                onPlannedChainSelect={selectPlannedBasket}
                isOwned={ownedIds.has(basket.id)}
                loading={loading && selectedBasket?.id === basket.id}
                isSelected={
                  selectedBasket?.id === basket.id && (showQuotePreview || showPlannedPanel)
                }
              />
            ))
          )}
        </div>

        <div className="lg:col-span-1 min-w-0">
          {showPlannedPanel && selectedBasket ? (
            <div className="sticky top-24 space-y-3">
              <div className="card-glow border-portx-warning/40 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-portx-warning mb-2">
                  {WARNING_MESSAGES.plannedChainBlocked}
                </p>
                <h3 className="text-lg font-bold mb-1">{selectedBasket.name}</h3>
                <p className="text-sm text-portx-muted mb-4">
                  {selectedBasket.chainLabel} · {selectedBasket.chainStatus}
                </p>
                <ExecutionWarning
                  variant="warning"
                  warnings={[getPlannedChainMessage(selectedBasket)]}
                />
                <p className="text-xs text-portx-muted mt-4">
                  No quote API call was made. Transaction review and execution readiness are not
                  available until {selectedBasket.chainLabel} routing is live.
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="btn-secondary w-full text-sm"
              >
                {BUTTON_LABELS.clearSelection}
              </button>
            </div>
          ) : showQuotePreview && preview ? (
            <div className="sticky top-24">
              <QuotePreviewCard
                preview={preview}
                quoteSource={quoteSource}
                onReview={handleReview}
                loading={loading}
                reviewLabel={BUTTON_LABELS.reviewExecute}
              />
              <button
                type="button"
                onClick={clearSelection}
                className="btn-secondary w-full mt-3 text-sm"
              >
                {BUTTON_LABELS.clearPreview}
              </button>
            </div>
          ) : (
            <EmptyState
              title={EMPTY_MESSAGES.noQuotePreview.title}
              description={EMPTY_MESSAGES.noQuotePreview.description}
            />
          )}
        </div>
      </div>

      <TransactionReviewModal
        plan={plan}
        open={modalOpen && showQuotePreview}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        confirming={confirming}
      />
    </div>
  )
}
