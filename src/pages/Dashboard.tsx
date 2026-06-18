import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { PortfolioSummary, PortfolioCard } from '@/components/PortfolioCard'
import { TokenRow } from '@/components/TokenRow'
import { BasketCard } from '@/components/BasketCard'
import { WhalePortfolioCard } from '@/components/WhalePortfolioCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { PortfolioHealthCard } from '@/components/PortfolioHealthCard'
import { PortfolioRebalancePreviewModal } from '@/components/PortfolioRebalancePreviewModal'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useBasket } from '@/hooks/useBasket'
import { usePortfolioDrift } from '@/hooks/usePortfolioDrift'
import { NOTABLE_PORTFOLIOS } from '@/data/notablePortfolios'
import {
  BUTTON_LABELS,
  EMPTY_MESSAGES,
  LOADING_MESSAGES,
  SUCCESS_MESSAGES,
  WARNING_MESSAGES,
} from '@/config/uiCopy'
import { TestnetPortfolioSummary } from '@/components/TestnetPortfolioSummary'
import { formatUsd, formatPercent } from '@/utils/format'

import type { Basket } from '@/types/basket'

export function Dashboard() {
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
    [portfolio.activeBaskets, getBasketById]
  )

  const { primaryDrift, getDriftForBasket } = usePortfolioDrift(
    portfolio.heldTokens,
    ownedBasketInputs
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">Portfolio Dashboard</h1>
          <p className="text-portx-muted mt-1">
            {isConnected ? 'Wallet connected · Demo portfolio' : 'Connect wallet to continue (demo data shown)'}
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

      <TestnetPortfolioSummary className="mt-6" />

      {!portfolio.portfolioLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <PortfolioCard
            label="Number of Positions"
            value={String(portfolio.positionCount)}
            subValue="Token holdings"
          />
          <PortfolioCard
            label="Largest Position"
            value={
              portfolio.largestPosition
                ? portfolio.largestPosition.token.symbol
                : '—'
            }
            subValue={
              portfolio.largestPosition
                ? formatUsd(portfolio.largestPosition.valueUsd)
                : EMPTY_MESSAGES.noHoldings.title
            }
            highlight={!!portfolio.largestPosition}
          />
          <PortfolioCard
            label="Active Baskets"
            value={String(portfolio.activeBasketsCount)}
            subValue={
              portfolio.activeBasketsCount === 1 ? '1 basket' : `${portfolio.activeBasketsCount} baskets`
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
          {portfolio.targetStatus.takeProfitHit && 'Take-profit target reached (demo alert). '}
          {portfolio.targetStatus.stopLossHit && 'Stop-loss threshold breached (demo alert). '}
          <Link to="/sell-all" className="underline ml-1">
            Review exits →
          </Link>
        </StatusBanner>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div className="card min-w-0">
          <h2 className="text-lg font-bold mb-4">Tokens Held</h2>
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
          <h2 className="text-lg font-bold mb-4">Target Sell Status</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-portx-muted">Take-profit</dt>
              <dd className="font-mono text-right">
                {portfolio.targets.takeProfitMultiplier
                  ? `${portfolio.targets.takeProfitMultiplier}x`
                  : portfolio.targets.targetSellPriceUsd
                    ? formatUsd(portfolio.targets.targetSellPriceUsd)
                    : 'Not set'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-portx-muted">Stop-loss</dt>
              <dd className="font-mono text-right">
                {portfolio.targets.stopLossPercent != null
                  ? `-${portfolio.targets.stopLossPercent}%`
                  : 'Not set'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-portx-muted">Portfolio P/L</dt>
              <dd className="font-mono text-portx-green">{formatPercent(portfolio.pnlPercent)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-portx-muted">Current value</dt>
              <dd className="font-mono text-portx-green">{formatUsd(portfolio.totalValueUsd)}</dd>
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
            <h2 className="text-xl font-bold">Trending now</h2>
            <p className="text-sm text-portx-muted">Demo portfolios — copy as basket templates</p>
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
          <h2 className="text-xl font-bold">Active Baskets</h2>
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
                  <p className="text-xs text-portx-muted mt-3 font-mono">
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
    </div>
  )
}
