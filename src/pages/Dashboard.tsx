import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { PortfolioSummary, PortfolioCard } from '@/components/PortfolioCard'
import { TokenRow } from '@/components/TokenRow'
import { BasketCard } from '@/components/BasketCard'
import { MyPortfolioCard } from '@/components/MyPortfolioCard'
import { WhalePortfolioCard } from '@/components/WhalePortfolioCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { PortfolioHealthCard } from '@/components/PortfolioHealthCard'
import { PortfolioRebalancePreviewModal } from '@/components/PortfolioRebalancePreviewModal'
import { RecentTestSwaps } from '@/components/RecentTestSwaps'
import { TestnetRebalancePreview } from '@/components/TestnetRebalancePreview'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useBasket } from '@/hooks/useBasket'
import { usePortfolioDrift } from '@/hooks/usePortfolioDrift'
import { useTestnetDashboardPortfolio } from '@/hooks/useTestnetDashboardPortfolio'
import { useTestnetPortfolioOwnership } from '@/hooks/useTestnetPortfolioOwnership'
import { NOTABLE_PORTFOLIOS } from '@/data/notablePortfolios'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { TESTNET_DASHBOARD } from '@/config/testnetUxCopy'
import { TESTNET_MULTI_TOKEN_BASKET } from '@/data/testnetMultiTokenBasket'
import { estimateBasketHoldingsValueUsd } from '@/utils/basketCatalog'
import {
  BUTTON_LABELS,
  EMPTY_MESSAGES,
  LOADING_MESSAGES,
  SUCCESS_MESSAGES,
  WARNING_MESSAGES,
} from '@/config/uiCopy'
import { TestnetPortfolioSummary } from '@/components/TestnetPortfolioSummary'
import { usePortfolioTradeEngine } from '@/hooks/usePortfolioTradeEngine'
import { TestnetPortfolioTradeModals } from '@/components/TestnetPortfolioTradeModals'
import { formatUsd, formatPercent } from '@/utils/format'

import type { Basket } from '@/types/basket'

function ProductionDashboard() {
  const { isConnected } = useAccount()
  const portfolio = usePortfolio()
  const { getBasketById, basketsLoading } = useBasket()
  const [rebalanceBasket, setRebalanceBasket] = useState<Basket | null>(null)

  const ownedBasketInputs = useMemo(
    () =>
      portfolio.activeBaskets
        .map((purchase) => {
          const basket = getBasketById(purchase.basketId)
          return basket ? { basket, basketId: purchase.basketId } : null
        })
        .filter((entry): entry is { basket: Basket; basketId: string } => entry !== null),
    [portfolio.activeBaskets, getBasketById],
  )

  const { primaryDrift, getDriftForBasket } = usePortfolioDrift(
    portfolio.heldTokens,
    ownedBasketInputs,
  )

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">{TESTNET_DASHBOARD.title}</h1>
          <p className="text-portx-muted mt-1">
            {isConnected
              ? 'Wallet connected · Production preview'
              : 'Connect wallet to continue (preview data shown)'}
          </p>
        </div>
        <Link to="/sell-all" className="btn-danger text-sm w-fit shrink-0">
          {BUTTON_LABELS.sellAllNav}
        </Link>
      </div>

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

      {portfolio.portfolioSource === 'api' && !portfolio.portfolioLoading && (
        <StatusBanner variant="success" className="mb-6" compact>
          {SUCCESS_MESSAGES.portfolioApi}
        </StatusBanner>
      )}

      {!portfolio.portfolioLoading && (
        <PortfolioSummary
          totalValueUsd={portfolio.totalValueUsd}
          pnlUsd={portfolio.pnlUsd}
          pnlPercent={portfolio.pnlPercent}
          costBasisUsd={portfolio.costBasisUsd}
        />
      )}

      {!portfolio.portfolioLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <PortfolioCard
            label="Portfolio Value"
            value={formatUsd(portfolio.totalValueUsd)}
            subValue="Demo portfolio"
            highlight
          />
          <PortfolioCard
            label="Largest Position"
            value={portfolio.largestPosition ? portfolio.largestPosition.token.symbol : '—'}
            subValue={
              portfolio.largestPosition
                ? formatUsd(portfolio.largestPosition.valueUsd)
                : EMPTY_MESSAGES.noHoldings.title
            }
            highlight={!!portfolio.largestPosition}
          />
          <PortfolioCard
            label="My Portfolios"
            value={String(portfolio.activeBasketsCount)}
            subValue={
              portfolio.activeBasketsCount === 1 ? '1 portfolio' : `${portfolio.activeBasketsCount} portfolios`
            }
          />
        </div>
      )}

      {!portfolio.portfolioLoading && (
        <PortfolioHealthCard
          className="mt-6"
          drift={primaryDrift?.drift ?? null}
          basketName={primaryDrift?.basketName}
        />
      )}

      {(portfolio.targetStatus.takeProfitHit || portfolio.targetStatus.stopLossHit) && (
        <StatusBanner variant="warning" className="mt-6">
          {portfolio.targetStatus.takeProfitHit && 'Take-profit target reached (preview alert). '}
          {portfolio.targetStatus.stopLossHit && 'Stop-loss threshold breached (preview alert). '}
          <Link to="/sell-all" className="underline ml-1">
            Review exits →
          </Link>
        </StatusBanner>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div className="card min-w-0">
          <h2 className="text-lg font-bold tracking-tight mb-4">Wallet Assets</h2>
          {portfolio.portfolioLoading ? (
            <p className="text-portx-muted text-sm" role="status">
              {LOADING_MESSAGES.holdings}
            </p>
          ) : portfolio.heldTokens.length === 0 ? (
            <EmptyState
              title={EMPTY_MESSAGES.noHoldings.title}
              description={EMPTY_MESSAGES.noHoldings.description}
              className="border-0 py-6"
            />
          ) : (
            portfolio.heldTokens.map((h) => <TokenRow key={h.token.symbol} holding={h} />)
          )}
        </div>

        <div className="card min-w-0">
          <h2 className="text-lg font-bold tracking-tight mb-4">Target Sell Status</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Take-profit</dt>
              <dd className="text-right tabular-nums tracking-tight">
                {portfolio.targets.takeProfitMultiplier
                  ? `${portfolio.targets.takeProfitMultiplier}x`
                  : portfolio.targets.targetSellPriceUsd
                    ? formatUsd(portfolio.targets.targetSellPriceUsd)
                    : 'Not set'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Stop-loss</dt>
              <dd className="text-right tabular-nums tracking-tight">
                {portfolio.targets.stopLossPercent != null
                  ? `-${portfolio.targets.stopLossPercent}%`
                  : 'Not set'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Portfolio P/L</dt>
              <dd className="tabular-nums tracking-tight text-portx-green">{formatPercent(portfolio.pnlPercent)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Current value</dt>
              <dd className="tabular-nums tracking-tight text-portx-green">{formatUsd(portfolio.totalValueUsd)}</dd>
            </div>
          </dl>
          <Link to="/sell-all" className="btn-secondary w-full mt-6 text-center text-sm">
            Configure Targets
          </Link>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold">Featured Portfolios</h2>
            <p className="text-sm text-portx-muted">Portfolio templates — copy from Discover</p>
          </div>
          <Link to="/discover" className="text-sm text-portx-green hover:underline shrink-0">
            Discover more →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {NOTABLE_PORTFOLIOS.slice(0, 3).map((p) => (
            <WhalePortfolioCard key={p.id} portfolio={p} compact />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">My Portfolios</h2>
          <Link to="/baskets" className="text-sm text-portx-green hover:underline">
            View all baskets →
          </Link>
        </div>
        {basketsLoading || portfolio.portfolioLoading ? (
          <StatusBanner variant="loading">{LOADING_MESSAGES.basketDetails}</StatusBanner>
        ) : portfolio.activeBaskets.length === 0 ? (
          <EmptyState
            title={EMPTY_MESSAGES.noActiveBaskets.title}
            description={EMPTY_MESSAGES.noActiveBaskets.description}
            action={
              <Link to="/baskets" className="btn-primary">
                {BUTTON_LABELS.exploreBaskets}
              </Link>
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {portfolio.activeBaskets.map((purchase) => {
              const basket = getBasketById(purchase.basketId)
              if (!basket) return null
              const drift = getDriftForBasket(purchase.basketId)
              return (
                <div key={purchase.basketId} className="card-glow min-w-0">
                  <BasketCard
                    basket={basket}
                    isOwned
                    driftStatus={drift?.status}
                    onPreviewRebalance={() => setRebalanceBasket(basket)}
                  />
                  <p className="text-xs text-zinc-400 mt-3 tabular-nums tracking-tight">
                    Position: {formatUsd(purchase.amountUsd)} · Entry {formatUsd(purchase.entryValueUsd)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <PortfolioRebalancePreviewModal
        open={rebalanceBasket !== null}
        basket={rebalanceBasket}
        drift={rebalanceBasket ? getDriftForBasket(rebalanceBasket.id) : null}
        onClose={() => setRebalanceBasket(null)}
      />
    </>
  )
}

function TestnetDashboard() {
  const { isConnected } = useAccount()
  const testnetPortfolio = useTestnetDashboardPortfolio()
  const { canSell, hasBasketHoldings } = useTestnetPortfolioOwnership()
  const { allBaskets, basketsLoading } = useBasket()
  const trade = usePortfolioTradeEngine()

  const ownedPortfolios = useMemo(() => {
    if (testnetPortfolio.activeBaskets.length > 0) return testnetPortfolio.activeBaskets
    if (hasBasketHoldings) {
      return [
        {
          basket: TESTNET_MULTI_TOKEN_BASKET,
          basketId: TESTNET_MULTI_TOKEN_BASKET.id,
          basketName: TESTNET_MULTI_TOKEN_BASKET.name,
          source: 'holdings' as const,
        },
      ]
    }
    return []
  }, [testnetPortfolio.activeBaskets, hasBasketHoldings])

  const tokenBalances = useMemo(
    () =>
      testnetPortfolio.walletAssets.map((asset) => ({
        symbol: asset.symbol,
        balanceDisplay: asset.balanceDisplay,
        estimatedValueDisplay: asset.estimatedValueDisplay,
      })),
    [testnetPortfolio.walletAssets],
  )

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">{TESTNET_DASHBOARD.title}</h1>
          <p className="text-portx-muted mt-1">
            {isConnected
              ? TESTNET_DASHBOARD.subtitleConnected
              : TESTNET_DASHBOARD.subtitleDisconnected}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/sell-all" className="btn-secondary text-sm">
            Sell Portfolio
          </Link>
          <Link to="/baskets" className="btn-primary text-sm">
            {TESTNET_DASHBOARD.tradeBasketsCta}
          </Link>
        </div>
      </div>

      {testnetPortfolio.isLoading && (
        <StatusBanner variant="loading" className="mb-6">
          Loading Sepolia wallet assets…
        </StatusBanner>
      )}

      {testnetPortfolio.error && !testnetPortfolio.isLoading && (
        <StatusBanner variant="warning" className="mb-6" onRetry={testnetPortfolio.refresh}>
          Failed to load on-chain wallet assets ({testnetPortfolio.error.message})
        </StatusBanner>
      )}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{TESTNET_DASHBOARD.myPortfoliosTitle}</h2>
          <Link to="/baskets" className="text-sm text-portx-green hover:underline">
            Browse baskets →
          </Link>
        </div>
        {basketsLoading || testnetPortfolio.isLoading ? (
          <StatusBanner variant="loading">{LOADING_MESSAGES.basketDetails}</StatusBanner>
        ) : ownedPortfolios.length === 0 ? (
          <EmptyState
            title={TESTNET_DASHBOARD.myPortfoliosEmptyTitle}
            description={TESTNET_DASHBOARD.myPortfoliosEmptyDescription}
            action={
              <Link to="/baskets" className="btn-primary">
                {BUTTON_LABELS.exploreBaskets}
              </Link>
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {ownedPortfolios.map(({ basket, basketId }) => {
              const estimatedValueUsd = estimateBasketHoldingsValueUsd(
                basket,
                testnetPortfolio.walletAssets,
              )
              return (
                <MyPortfolioCard
                  key={basketId}
                  basket={basket}
                  estimatedValueUsd={estimatedValueUsd}
                  tokenBalances={tokenBalances}
                  ownershipNote="Detected from on-chain Sepolia holdings"
                  canSell={canSell(basketId)}
                  actionLoading={trade.loading && trade.selectedBasket?.id === basketId}
                  onBuyMore={() => void trade.openBuyPreviewAndReview(basketId)}
                  onSell={() => void trade.openSellPreviewAndReview(basketId)}
                  onRebalance={() => trade.openRebalancePreview(basketId)}
                />
              )
            })}
          </div>
        )}
      </section>

      {!testnetPortfolio.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PortfolioCard
            label={TESTNET_DASHBOARD.totalValueLabel}
            value={testnetPortfolio.totalValueDisplay}
            subValue={TESTNET_DASHBOARD.testnetEstimateNote}
            highlight
          />
          <PortfolioCard
            label={TESTNET_DASHBOARD.largestPositionLabel}
            value={testnetPortfolio.largestAssetSymbol ?? '—'}
            subValue={testnetPortfolio.largestAssetValueDisplay ?? 'No on-chain assets'}
            highlight={!!testnetPortfolio.largestAssetSymbol}
          />
          <PortfolioCard
            label={TESTNET_DASHBOARD.positionsLabel}
            value={String(testnetPortfolio.assetCount)}
            subValue="Non-zero Sepolia balances"
          />
          <PortfolioCard
            label={TESTNET_DASHBOARD.activeBasketsLabel}
            value={String(ownedPortfolios.length)}
            subValue={
              ownedPortfolios.length === 1 ? '1 portfolio' : `${ownedPortfolios.length} portfolios`
            }
          />
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4">{TESTNET_DASHBOARD.recentTradesTitle}</h2>
        <RecentTestSwaps compact />
      </section>

      <TestnetPortfolioSummary
        className="mt-10"
        embeddedInDashboard
        portfolio={testnetPortfolio}
      />

      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4">{TESTNET_DASHBOARD.rebalanceTitle}</h2>
        <TestnetRebalancePreview
          balances={testnetPortfolio.balances}
          latestPosition={testnetPortfolio.latestExecution}
          baskets={allBaskets}
          compact
        />
      </section>

      <TestnetPortfolioTradeModals />
    </>
  )
}

export function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {ENABLE_TESTNET_MODE ? <TestnetDashboard /> : <ProductionDashboard />}
    </div>
  )
}
