import type { PortfolioDriftResult } from '@/utils/portfolioDrift'
import { BuyAmountSelectorModal } from '@/components/BuyAmountSelectorModal'
import { usePortfolioTradeEngine } from '@/hooks/usePortfolioTradeEngine'
import { TransactionReviewModal } from '@/components/TransactionReviewModal'
import { PortfolioRebalancePreviewModal } from '@/components/PortfolioRebalancePreviewModal'
import { QuotePreviewCard } from '@/components/QuotePreviewCard'
import { TESTNET_BUTTONS } from '@/config/testnetUxCopy'
import { BUTTON_LABELS } from '@/config/uiCopy'

interface TestnetPortfolioTradeModalsProps {
  rebalanceDrift?: PortfolioDriftResult | null
  /** When true, render inline QuotePreviewCard above modals */
  showInlinePreview?: boolean
  onClearPreview?: () => void
}

export function TestnetPortfolioTradeModals({
  rebalanceDrift = null,
  showInlinePreview = false,
  onClearPreview,
}: TestnetPortfolioTradeModalsProps) {
  const trade = usePortfolioTradeEngine()

  const reviewLabel =
    trade.quoteSource === 'testnet'
      ? trade.preview?.type === 'sell_basket'
        ? TESTNET_BUTTONS.reviewSell
        : TESTNET_BUTTONS.reviewTrade
      : BUTTON_LABELS.reviewExecute

  return (
    <>
      {showInlinePreview && trade.showQuotePreview && trade.preview && (
        <div className="mb-6">
          <QuotePreviewCard
            preview={trade.preview}
            quoteSource={trade.quoteSource}
            onReview={trade.openReviewModal}
            loading={trade.loading}
            reviewLabel={reviewLabel}
          />
          {onClearPreview && (
            <button type="button" onClick={onClearPreview} className="btn-secondary w-full mt-3 text-sm">
              {BUTTON_LABELS.clearPreview}
            </button>
          )}
        </div>
      )}

      <BuyAmountSelectorModal
        open={trade.buyAmountModalOpen}
        basket={trade.pendingBuyBasket}
        initialAmountUsd={trade.buyAmountUsd}
        loading={trade.loading}
        onClose={() => trade.closeBuyAmountSelector()}
        onConfirm={(amountUsd) => void trade.confirmBuyAmountAndReview(amountUsd)}
      />

      <TransactionReviewModal
        plan={trade.plan}
        quoteSource={trade.quoteSource}
        open={trade.modalOpen && trade.showQuotePreview}
        onClose={() => trade.setModalOpen(false)}
        onConfirm={() => void trade.handleConfirm()}
        confirming={trade.confirming}
        onTestnetExecutionSuccess={trade.handleTestnetExecutionSuccess}
      />

      <PortfolioRebalancePreviewModal
        open={trade.rebalanceBasket !== null}
        basket={trade.rebalanceBasket}
        drift={rebalanceDrift}
        onClose={() => trade.closeRebalancePreview()}
      />
    </>
  )
}
