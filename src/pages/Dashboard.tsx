import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { PortfolioSummary } from '@/components/PortfolioCard'
import { TokenRow } from '@/components/TokenRow'
import { BasketCard } from '@/components/BasketCard'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useBasket } from '@/hooks/useBasket'
import { formatUsd } from '@/utils/format'

export function Dashboard() {
  const { isConnected } = useAccount()
  const portfolio = usePortfolio()
  const { getBasketById } = useBasket()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">Portfolio Dashboard</h1>
          <p className="text-portx-muted mt-1">
            {isConnected ? 'Wallet connected · Demo portfolio' : 'Connect wallet to continue (demo data shown)'}
          </p>
        </div>
        <Link to="/sell-all" className="btn-danger text-sm w-fit">
          Sell All
        </Link>
      </div>

      <PortfolioSummary
        totalValueUsd={portfolio.totalValueUsd}
        pnlUsd={portfolio.pnlUsd}
        pnlPercent={portfolio.pnlPercent}
        costBasisUsd={portfolio.costBasisUsd}
      />

      {(portfolio.targetStatus.takeProfitHit || portfolio.targetStatus.stopLossHit) && (
        <div className="mt-6 p-4 rounded-xl border border-portx-warning/50 bg-portx-warning/10 text-portx-warning">
          {portfolio.targetStatus.takeProfitHit && 'Take-profit target reached (demo alert). '}
          {portfolio.targetStatus.stopLossHit && 'Stop-loss threshold breached (demo alert). '}
          <Link to="/sell-all" className="underline ml-1">
            Review exits →
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Tokens Held</h2>
          {portfolio.heldTokens.length === 0 ? (
            <p className="text-portx-muted text-sm">No tokens in demo portfolio.</p>
          ) : (
            portfolio.heldTokens.map((h) => <TokenRow key={h.token.symbol} holding={h} />)
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-bold mb-4">Target Sell Status</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-portx-muted">Take-profit</dt>
              <dd className="font-mono">
                {portfolio.targets.takeProfitMultiplier
                  ? `${portfolio.targets.takeProfitMultiplier}x`
                  : portfolio.targets.targetSellPriceUsd
                    ? formatUsd(portfolio.targets.targetSellPriceUsd)
                    : 'Not set'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-portx-muted">Stop-loss</dt>
              <dd className="font-mono">
                {portfolio.targets.stopLossPercent != null
                  ? `-${portfolio.targets.stopLossPercent}%`
                  : 'Not set'}
              </dd>
            </div>
            <div className="flex justify-between">
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Active Baskets</h2>
          <Link to="/baskets" className="text-sm text-portx-green hover:underline">
            View all baskets →
          </Link>
        </div>
        {portfolio.activeBaskets.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-portx-muted mb-4">No active basket positions.</p>
            <Link to="/baskets" className="btn-primary">
              Explore Baskets
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {portfolio.activeBaskets.map((purchase) => {
              const basket = getBasketById(purchase.basketId)
              if (!basket) return null
              return (
                <div key={purchase.basketId} className="card-glow">
                  <BasketCard basket={basket} isOwned />
                  <p className="text-xs text-portx-muted mt-3 font-mono">
                    Position: {formatUsd(purchase.amountUsd)} · Entry {formatUsd(purchase.entryValueUsd)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
