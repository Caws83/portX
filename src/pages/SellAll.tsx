import { useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useSellAllPreview } from '@/hooks/useSellAllPreview'
import { SellAllButton } from '@/components/SellAllButton'
import { TargetSellForm } from '@/components/TargetSellForm'
import { StopLossForm } from '@/components/StopLossForm'
import { PortfolioSummary } from '@/components/PortfolioCard'
import { SellAllPreviewCard } from '@/components/SellAllPreviewCard'
import { TransactionReviewModal } from '@/components/TransactionReviewModal'
import { ExecutionWarning } from '@/components/ExecutionWarning'
import { executeDemoPlan } from '@/services/transactionBuilder'
import { formatUsd } from '@/utils/format'

export function SellAll() {
  const portfolio = usePortfolio()
  const sellAllPortfolio = portfolio.sellAllPortfolio
  const {
    preview,
    plan,
    loading,
    error,
    quoteSource,
    previewSellAllPortfolio,
    retrySellAllQuote,
    buildPlan,
    clear,
  } = useSellAllPreview()

  const [modalOpen, setModalOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [txMsg, setTxMsg] = useState<string | null>(null)

  const handlePreview = async () => {
    setTxMsg(null)
    if (portfolio.heldTokens.length === 0) return
    await previewSellAllPortfolio(portfolio.heldTokens)
  }

  const handleReview = () => {
    if (!preview) return
    buildPlan(preview)
    setModalOpen(true)
  }

  const handleConfirmDemo = async () => {
    if (!plan) return
    setConfirming(true)
    try {
      const result = await executeDemoPlan(plan)
      sellAllPortfolio()
      setTxMsg(result.message)
      setModalOpen(false)
      clear()
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="section-title mb-2">Sell All & Exits</h1>
      <p className="text-portx-muted mb-8">
        Preview full portfolio unwind quotes, then confirm demo execution.
      </p>

      <ExecutionWarning variant="demo" />

      <div className="card border-portx-danger/40 bg-portx-danger/5 mb-8 mt-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h2 className="text-lg font-bold text-portx-danger mb-2">Non-custodial exit</h2>
            <p className="text-sm text-portx-muted">
              PortX never holds your funds. Each token sells back to USDC via the best route
              (0x → 1inch → Uniswap). You sign every swap from your wallet when live execution
              is enabled.
            </p>
          </div>
        </div>
      </div>

      <PortfolioSummary
        totalValueUsd={portfolio.totalValueUsd}
        pnlUsd={portfolio.pnlUsd}
        pnlPercent={portfolio.pnlPercent}
        costBasisUsd={portfolio.costBasisUsd}
      />

      <div className="card-glow my-8 p-8">
        <p className="text-portx-muted text-sm mb-2 text-center">Full portfolio value</p>
        <p className="text-4xl font-bold font-mono gradient-text mb-6 text-center">
          {formatUsd(portfolio.totalValueUsd)}
        </p>

        {loading && (
          <div className="mb-6 p-4 rounded-xl border border-portx-border bg-portx-surface text-sm text-portx-muted text-center">
            Loading sell-all quote from API…
          </div>
        )}

        {quoteSource === 'fallback' && preview && !loading && (
          <div className="mb-6 p-4 rounded-xl border border-portx-warning/50 bg-portx-warning/10 text-sm text-portx-warning flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>Using local sell-all fallback</span>
            <button
              type="button"
              onClick={() => void retrySellAllQuote(portfolio.heldTokens)}
              className="btn-secondary text-sm py-2 px-4 shrink-0"
            >
              Retry API
            </button>
          </div>
        )}

        {quoteSource === 'api' && preview && !loading && (
          <div className="mb-6 p-3 rounded-xl border border-portx-green/30 bg-portx-green/10 text-xs text-portx-green text-center">
            Sell-all quote loaded from PortX API
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading || portfolio.heldTokens.length === 0}
            className="btn-primary flex-1 py-3 disabled:opacity-50"
          >
            {loading ? 'Fetching quotes...' : 'Preview Sell All'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-portx-danger text-center mb-4">{error}</p>
        )}

        {txMsg && (
          <p className="text-sm text-portx-green text-center mb-4">{txMsg}</p>
        )}

        {preview && (
          <div className="mb-6">
            <SellAllPreviewCard
              preview={preview}
              onReview={handleReview}
              reviewLabel="Review & Confirm Demo Sell"
            />
            <button type="button" onClick={clear} className="btn-secondary w-full mt-3 text-sm">
              Clear Preview
            </button>
          </div>
        )}

        <SellAllButton
          portfolioValueUsd={portfolio.totalValueUsd}
          onConfirm={sellAllPortfolio}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <TargetSellForm />
        <StopLossForm />
      </div>

      <TransactionReviewModal
        plan={plan}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmDemo}
        confirming={confirming}
      />
    </div>
  )
}
