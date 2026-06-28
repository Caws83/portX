import type { PortfolioDriftResult } from '@/utils/portfolioDrift'
import type { QuoteSource } from '@/hooks/useQuotePreview'
import type { ExecutionPlan } from '@/types/execution'
import type { BasketQuotePreview } from '@/types/quote'
import type { Basket } from '@/types/basket'
import { TransactionReviewModal } from '@/components/TransactionReviewModal'
import { PortfolioRebalancePreviewModal } from '@/components/PortfolioRebalancePreviewModal'
import { QuotePreviewCard } from '@/components/QuotePreviewCard'
import { TESTNET_BUTTONS } from '@/config/testnetUxCopy'
import { BUTTON_LABELS } from '@/config/uiCopy'

interface TestnetPortfolioTradeModalsProps {
  preview: BasketQuotePreview | null
  plan: ExecutionPlan | null
  quoteSource: QuoteSource
  loading?: boolean
  selectedBasket: Basket | null
  modalOpen: boolean
  confirming?: boolean
  showQuotePreview?: boolean
  rebalanceBasket?: Basket | null
  rebalanceDrift?: PortfolioDriftResult | null
  onCloseModal: () => void
  onConfirm: () => void
  onReview: () => void
  onClearPreview?: () => void
  onTestnetExecutionSuccess?: () => void
  onCloseRebalance?: () => void
  /** When true, render inline QuotePreviewCard above modals */
  showInlinePreview?: boolean
}

export function TestnetPortfolioTradeModals({
  preview,
  plan,
  quoteSource,
  loading = false,
  selectedBasket: _selectedBasket,
  modalOpen,
  confirming,
  showQuotePreview = false,
  rebalanceBasket = null,
  rebalanceDrift,
  onCloseModal,
  onConfirm,
  onReview,
  onClearPreview,
  onTestnetExecutionSuccess,
  onCloseRebalance,
  showInlinePreview = false,
}: TestnetPortfolioTradeModalsProps) {
  const reviewLabel =
    quoteSource === 'testnet'
      ? preview?.type === 'sell_basket'
        ? TESTNET_BUTTONS.reviewSell
        : TESTNET_BUTTONS.reviewTrade
      : BUTTON_LABELS.reviewExecute

  return (
    <>
      {showInlinePreview && showQuotePreview && preview && (
        <div className="mb-6">
          <QuotePreviewCard
            preview={preview}
            quoteSource={quoteSource}
            onReview={onReview}
            loading={loading}
            reviewLabel={reviewLabel}
          />
          {onClearPreview && (
            <button type="button" onClick={onClearPreview} className="btn-secondary w-full mt-3 text-sm">
              {BUTTON_LABELS.clearPreview}
            </button>
          )}
        </div>
      )}

      <TransactionReviewModal
        plan={plan}
        quoteSource={quoteSource}
        open={modalOpen && showQuotePreview}
        onClose={onCloseModal}
        onConfirm={onConfirm}
        confirming={confirming}
        onTestnetExecutionSuccess={onTestnetExecutionSuccess}
      />

      <PortfolioRebalancePreviewModal
        open={rebalanceBasket !== null}
        basket={rebalanceBasket}
        drift={rebalanceDrift ?? null}
        onClose={() => onCloseRebalance?.()}
      />
    </>
  )
}
