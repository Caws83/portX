import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useSellAllPreview } from '@/hooks/useSellAllPreview'
import { useTestnetPortfolioOwnership } from '@/hooks/useTestnetPortfolioOwnership'
import { SellAllButton } from '@/components/SellAllButton'
import { TargetSellForm } from '@/components/TargetSellForm'
import { StopLossForm } from '@/components/StopLossForm'
import { PortfolioSummary, PortfolioCard } from '@/components/PortfolioCard'
import { SellAllPreviewCard } from '@/components/SellAllPreviewCard'
import { TransactionReviewModal } from '@/components/TransactionReviewModal'
import { ExecutionWarning } from '@/components/ExecutionWarning'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { executeDemoPlan } from '@/services/transactionBuilder'
import { assessQuoteQuality } from '@/utils/quoteQuality'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { TESTNET_BUTTONS } from '@/config/testnetUxCopy'
import {
  BUTTON_LABELS,
  EMPTY_MESSAGES,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  WARNING_MESSAGES,
} from '@/config/uiCopy'
import { formatUsd } from '@/utils/format'

function TestnetSellAll() {
  const navigate = useNavigate()
  const { portfolio, ownedIds, canSell } = useTestnetPortfolioOwnership()
  const hasHoldings = portfolio.walletAssets.length > 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="section-title mb-2">Sell Portfolio</h1>
      <p className="text-portx-muted mb-8">
        Sell from your Sepolia wallet holdings. Portfolio detection uses on-chain balances, not
        demo data.
      </p>

      {portfolio.isLoading && (
        <StatusBanner variant="loading" className="mb-6">
          Loading Sepolia wallet assets…
        </StatusBanner>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <PortfolioCard
          label="Wallet value"
          value={portfolio.totalValueDisplay}
          subValue="Sepolia testnet estimate"
          highlight
        />
        <PortfolioCard
          label="My Portfolios"
          value={String(portfolio.activeBasketsCount)}
          subValue={`${portfolio.assetCount} on-chain asset(s)`}
        />
      </div>

      <div className="card min-w-0 mb-8">
        <h2 className="text-lg font-bold mb-4">Wallet Assets</h2>
        {!hasHoldings && !portfolio.isLoading ? (
          <EmptyState
            title="No Sepolia holdings"
            description="Buy a portfolio from Baskets to build on-chain holdings first."
            action={
              <Link to="/baskets" className="btn-primary">
                Explore baskets
              </Link>
            }
            className="border-0 py-6"
          />
        ) : (
          portfolio.walletAssets.map((asset) => (
            <div
              key={asset.symbol}
              className="flex justify-between items-center py-3 border-b border-portx-border last:border-0 text-sm"
            >
              <span className="font-mono">{asset.symbol}</span>
              <span className="text-portx-muted tabular-nums">{asset.estimatedValueDisplay}</span>
            </div>
          ))
        )}
      </div>

      {ownedIds.size > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Sell a portfolio</h2>
          {portfolio.activeBaskets.map(({ basket, basketId }) => (
            <div key={basketId} className="card-glow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold">{basket.name}</p>
                <p className="text-sm text-portx-muted">{basket.allocations.length} tokens in basket</p>
              </div>
              <button
                type="button"
                disabled={!canSell(basketId)}
                onClick={() => navigate('/baskets', { state: { basketId, action: 'sell' } })}
                className="btn-secondary text-sm py-2.5 px-6 disabled:opacity-50"
              >
                {canSell(basketId) ? TESTNET_BUTTONS.previewSell : 'No sellable holdings'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        !portfolio.isLoading && (
          <EmptyState
            title="No owned portfolios"
            description="Execute a Sepolia portfolio buy — your basket will appear here for selling."
            action={
              <Link to="/baskets" className="btn-primary">
                Go to Baskets
              </Link>
            }
          />
        )
      )}
    </div>
  )
}

function ProductionSellAll() {
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

  const quoteQuality = useMemo(
    () => (preview && quoteSource ? assessQuoteQuality(preview, quoteSource) : null),
    [preview, quoteSource]
  )

  const hasHoldings = portfolio.heldTokens.length > 0

  const handlePreview = async () => {
    setTxMsg(null)
    if (!hasHoldings) return
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
      <h1 className="section-title mb-2">{BUTTON_LABELS.sellAll}</h1>
      <p className="text-portx-muted mb-8">
        Preview full portfolio unwind quotes, then confirm demo execution.
      </p>

      {portfolio.portfolioLoading && (
        <StatusBanner variant="loading" className="mb-6">
          {LOADING_MESSAGES.portfolio}
        </StatusBanner>
      )}

      {portfolio.portfolioError && portfolio.portfolioSource === 'fallback' && !portfolio.portfolioLoading && (
        <StatusBanner variant="warning" className="mb-6" onRetry={portfolio.retryPortfolio}>
          {WARNING_MESSAGES.apiOfflineFallback('portfolio')} ({portfolio.portfolioError})
        </StatusBanner>
      )}

      <ExecutionWarning variant="demo" />

      <div className="card border-portx-danger/40 bg-portx-danger/5 mb-8 mt-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0" aria-hidden>
            ⚠️
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-portx-danger mb-2">Non-custodial exit</h2>
            <p className="text-sm text-portx-muted">
              PortX never holds your funds. Each token sells back to USDC via the best route
              (0x → 1inch → Uniswap). You sign every swap from your wallet when live execution
              is enabled.
            </p>
          </div>
        </div>
      </div>

      {!portfolio.portfolioLoading && (
        <PortfolioSummary
          totalValueUsd={portfolio.totalValueUsd}
          pnlUsd={portfolio.pnlUsd}
          pnlPercent={portfolio.pnlPercent}
          costBasisUsd={portfolio.costBasisUsd}
        />
      )}

      <div className="card-glow my-8 p-6 sm:p-8 min-w-0">
        <p className="text-portx-muted text-sm mb-2 text-center">Full portfolio value</p>
        <p className="text-3xl sm:text-4xl font-bold font-mono gradient-text mb-6 text-center">
          {formatUsd(portfolio.totalValueUsd)}
        </p>

        {!hasHoldings && !portfolio.portfolioLoading && (
          <EmptyState
            title={EMPTY_MESSAGES.noSellAllHoldings.title}
            description={EMPTY_MESSAGES.noSellAllHoldings.description}
            className="mb-6 border-0 py-6"
          />
        )}

        {loading && (
          <StatusBanner variant="loading" className="mb-6">
            {LOADING_MESSAGES.sellAllQuote}
          </StatusBanner>
        )}

        {quoteSource === 'fallback' && preview && !loading && (
          <StatusBanner variant="warning" className="mb-6" onRetry={() => void retrySellAllQuote(portfolio.heldTokens)}>
            {WARNING_MESSAGES.sellAllFallback}
          </StatusBanner>
        )}

        {quoteSource === 'api' && preview && !loading && quoteQuality && (
          <StatusBanner
            variant={quoteQuality.kind === 'live_0x' ? 'success' : 'warning'}
            className="mb-6"
            compact
          >
            {quoteQuality.bannerMessage}
          </StatusBanner>
        )}

        <button
          type="button"
          onClick={handlePreview}
          disabled={loading || !hasHoldings || portfolio.portfolioLoading}
          aria-busy={loading}
          aria-disabled={loading || !hasHoldings}
          className="btn-primary w-full py-3 mb-6 disabled:opacity-50"
        >
          {loading ? BUTTON_LABELS.fetchingQuotes : BUTTON_LABELS.previewSellAll}
        </button>

        {error && (
          <StatusBanner variant="error" className="mb-4">
            {error || ERROR_MESSAGES.sellAllFailed}
          </StatusBanner>
        )}

        {txMsg && (
          <StatusBanner variant="success" className="mb-4">
            {txMsg}
          </StatusBanner>
        )}

        {preview && (
          <div className="mb-6">
            <SellAllPreviewCard
              preview={preview}
              quoteSource={quoteSource}
              onReview={handleReview}
              reviewLabel={BUTTON_LABELS.reviewDemoSell}
            />
            <button type="button" onClick={clear} className="btn-secondary w-full mt-3 text-sm">
              {BUTTON_LABELS.clearPreview}
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
        quoteSource={quoteSource}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmDemo}
        confirming={confirming}
      />
    </div>
  )
}

export function SellAll() {
  return ENABLE_TESTNET_MODE ? <TestnetSellAll /> : <ProductionSellAll />
}
