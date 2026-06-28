import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useSellAllPreview } from '@/hooks/useSellAllPreview'
import { useQuotePreview } from '@/hooks/useQuotePreview'
import { useTestnetPortfolioOwnership } from '@/hooks/useTestnetPortfolioOwnership'
import { usePortfolioStore } from '@/store/portfolioStore'
import { SellAllButton } from '@/components/SellAllButton'
import { TargetSellForm } from '@/components/TargetSellForm'
import { StopLossForm } from '@/components/StopLossForm'
import { PortfolioSummary, PortfolioCard } from '@/components/PortfolioCard'
import { SellAllPreviewCard } from '@/components/SellAllPreviewCard'
import { QuotePreviewCard } from '@/components/QuotePreviewCard'
import { TransactionReviewModal } from '@/components/TransactionReviewModal'
import { PortfolioTargetControls } from '@/components/PortfolioTargetControls'
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
import { TESTNET_MULTI_TOKEN_BASKET } from '@/data/testnetMultiTokenBasket'
import { estimateBasketHoldingsValueUsd } from '@/utils/basketCatalog'
import { TESTNET_DASHBOARD_REFRESH_EVENT } from '@/hooks/useTestnetDashboardPortfolio'

function TestnetSellAll() {
  const { isConnected } = useAccount()
  const demoActiveBaskets = usePortfolioStore((s) => s.activeBaskets)
  const { portfolio, hasBasketHoldings, canSell } = useTestnetPortfolioOwnership()

  const {
    preview,
    plan,
    loading,
    error,
    quoteSource,
    previewSellBasket,
    retrySellQuote,
    buildPlan,
    clear,
  } = useQuotePreview()

  const [modalOpen, setModalOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [txMsg, setTxMsg] = useState<string | null>(null)
  const [partialNotice, setPartialNotice] = useState<string | null>(null)

  const ownedBasket = useMemo(() => {
    if (hasBasketHoldings) return TESTNET_MULTI_TOKEN_BASKET
    const entry = portfolio.activeBaskets.find(
      (b) => b.basketId === TESTNET_MULTI_TOKEN_BASKET.id,
    )
    return entry?.basket ?? null
  }, [hasBasketHoldings, portfolio.activeBaskets])

  const estimatedValueUsd = useMemo(
    () =>
      ownedBasket
        ? estimateBasketHoldingsValueUsd(ownedBasket, portfolio.walletAssets)
        : 0,
    [ownedBasket, portfolio.walletAssets],
  )

  const balancesWei = useMemo(
    () =>
      Object.fromEntries(
        portfolio.balances.assets.map((asset) => [asset.symbol, asset.balanceWei]),
      ),
    [portfolio.balances.assets],
  )

  const quoteQuality = useMemo(
    () => (preview && quoteSource ? assessQuoteQuality(preview, quoteSource) : null),
    [preview, quoteSource],
  )

  const basketHoldings = useMemo(() => {
    if (!ownedBasket) return []
    const symbols = new Set(ownedBasket.allocations.map((a) => a.token.symbol.toUpperCase()))
    return portfolio.walletAssets.filter((asset) => symbols.has(asset.symbol.toUpperCase()))
  }, [ownedBasket, portfolio.walletAssets])

  const handleSell100 = async () => {
    if (!ownedBasket || !canSell(ownedBasket.id)) return
    setPartialNotice(null)
    setTxMsg(null)
    const purchase = demoActiveBaskets.find((b) => b.basketId === ownedBasket.id)
    await previewSellBasket(
      ownedBasket,
      purchase?.amountUsd ?? Math.max(estimatedValueUsd, 100),
      isConnected ? balancesWei : undefined,
    )
  }

  const handlePartialPlaceholder = (label: string) => {
    setPartialNotice(`${label} — partial sell coming soon`)
  }

  const handleReview = () => {
    if (!preview || !ownedBasket) return
    buildPlan(preview)
    setModalOpen(true)
  }

  const handleConfirm = async () => {
    if (!plan) return
    setConfirming(true)
    try {
      const result = await executeDemoPlan(plan)
      setTxMsg(result.message)
      setModalOpen(false)
      clear()
      portfolio.refresh()
      window.dispatchEvent(new Event(TESTNET_DASHBOARD_REFRESH_EVENT))
    } finally {
      setConfirming(false)
    }
  }

  const handleTestnetExecutionSuccess = () => {
    portfolio.refresh()
    window.dispatchEvent(new Event(TESTNET_DASHBOARD_REFRESH_EVENT))
  }

  const showOwnedPortfolio = Boolean(ownedBasket && (hasBasketHoldings || portfolio.activeBaskets.length > 0))

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="section-title mb-2">Sell Portfolio</h1>
      <p className="text-portx-muted mb-8">
        Sell from your Sepolia wallet holdings. Ownership is detected from on-chain LINK, UNI, WETH,
        and AAVE balances.
      </p>

      {portfolio.isLoading && (
        <StatusBanner variant="loading" className="mb-6">
          Loading Sepolia wallet assets…
        </StatusBanner>
      )}

      {portfolio.error && !portfolio.isLoading && (
        <StatusBanner variant="warning" className="mb-6" onRetry={portfolio.refresh}>
          Failed to load wallet assets ({portfolio.error.message})
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
          label="Owned portfolios"
          value={showOwnedPortfolio ? '1' : '0'}
          subValue={`${portfolio.assetCount} on-chain asset(s)`}
        />
      </div>

      {showOwnedPortfolio && ownedBasket ? (
        <div className="card-glow mb-8 border-portx-green/25">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-portx-green mb-1">
                My Portfolio
              </p>
              <h2 className="text-xl font-bold">{ownedBasket.name}</h2>
              <p className="text-sm text-portx-muted mt-1">
                Est. value {formatUsd(estimatedValueUsd)} · {basketHoldings.length} token
                {basketHoldings.length === 1 ? '' : 's'} held
              </p>
            </div>
            <Link to="/baskets" className="btn-secondary text-sm py-2 px-4 shrink-0">
              Buy More
            </Link>
          </div>

          {basketHoldings.length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
                Token balances
              </p>
              {basketHoldings.map((asset) => (
                <div
                  key={asset.symbol}
                  className="flex justify-between items-center text-sm py-2 border-b border-portx-border last:border-0"
                >
                  <span className="font-mono">{asset.symbol}</span>
                  <span className="text-portx-muted tabular-nums">
                    {asset.balanceDisplay} · {asset.estimatedValueDisplay}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">Sell</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSell100()}
                disabled={loading || !canSell(ownedBasket.id)}
                className="btn-primary text-sm py-2.5 px-4 disabled:opacity-50"
              >
                {loading ? BUTTON_LABELS.fetchingQuotes : 'Sell 100%'}
              </button>
              <button
                type="button"
                onClick={() => handlePartialPlaceholder('Sell 50%')}
                className="btn-secondary text-sm py-2.5 px-4"
              >
                Sell 50%
              </button>
              <button
                type="button"
                onClick={() => handlePartialPlaceholder('Custom %')}
                className="btn-secondary text-sm py-2.5 px-4"
              >
                Custom %
              </button>
            </div>
            {partialNotice && (
              <StatusBanner variant="info" compact>
                {partialNotice}
              </StatusBanner>
            )}
          </div>

          {loading && (
            <StatusBanner variant="loading" className="mb-4">
              {LOADING_MESSAGES.quotePreview}
            </StatusBanner>
          )}

          {error && (
            <StatusBanner variant="error" className="mb-4">
              {error || ERROR_MESSAGES.quoteFailed}
            </StatusBanner>
          )}

          {quoteSource === 'fallback' && preview && !loading && (
            <StatusBanner variant="warning" className="mb-4" onRetry={() => void retrySellQuote()}>
              {WARNING_MESSAGES.sellBasketFallback}
            </StatusBanner>
          )}

          {quoteSource === 'api' && preview && !loading && quoteQuality && (
            <StatusBanner
              variant={quoteQuality.kind === 'live_0x' ? 'success' : 'warning'}
              className="mb-4"
              compact
            >
              {quoteQuality.bannerMessage}
            </StatusBanner>
          )}

          {quoteSource === 'testnet' && preview && !loading && (
            <StatusBanner variant="info" className="mb-4" compact>
              Sepolia preview quote — wallet holdings priced to USDC via Uniswap V3.
            </StatusBanner>
          )}

          {preview && preview.type === 'sell_basket' && (
            <div className="mb-6">
              <QuotePreviewCard
                preview={preview}
                quoteSource={quoteSource}
                onReview={handleReview}
                loading={loading}
                reviewLabel={TESTNET_BUTTONS.reviewSell}
              />
              <button type="button" onClick={clear} className="btn-secondary w-full mt-3 text-sm">
                {BUTTON_LABELS.clearPreview}
              </button>
            </div>
          )}

          {txMsg && (
            <StatusBanner variant="success" className="mb-4">
              {txMsg}
            </StatusBanner>
          )}

          <PortfolioTargetControls basketId={ownedBasket.id} />
        </div>
      ) : (
        !portfolio.isLoading && (
          <EmptyState
            title="No owned portfolios"
            description="Buy Sepolia Multi-Token Beta from Baskets — it will appear here when your wallet holds basket tokens."
            action={
              <Link to="/baskets" className="btn-primary">
                Go to Baskets
              </Link>
            }
            className="mb-8"
          />
        )
      )}

      <TransactionReviewModal
        plan={plan}
        quoteSource={quoteSource}
        open={modalOpen && preview?.type === 'sell_basket'}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        confirming={confirming}
        onTestnetExecutionSuccess={handleTestnetExecutionSuccess}
      />
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
