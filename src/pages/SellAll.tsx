import { usePortfolio } from '@/hooks/usePortfolio'
import { SellAllButton } from '@/components/SellAllButton'
import { TargetSellForm } from '@/components/TargetSellForm'
import { StopLossForm } from '@/components/StopLossForm'
import { PortfolioSummary } from '@/components/PortfolioCard'
import { formatUsd } from '@/utils/format'

export function SellAll() {
  const portfolio = usePortfolio()
  const sellAllPortfolio = portfolio.sellAllPortfolio

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="section-title mb-2">Sell All & Exits</h1>
      <p className="text-portx-muted mb-8">
        Close your entire portfolio or configure portfolio-level exit targets.
      </p>

      <div className="card border-portx-danger/40 bg-portx-danger/5 mb-8">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h2 className="text-lg font-bold text-portx-danger mb-2">Warning</h2>
            <p className="text-sm text-portx-muted">
              Selling your entire portfolio will close all demo positions and baskets. In production,
              this triggers batch DEX sells via 0x / 1inch / Uniswap routing and on-chain settlement.
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

      <div className="card-glow my-8 text-center p-8">
        <p className="text-portx-muted text-sm mb-2">Full portfolio value</p>
        <p className="text-4xl font-bold font-mono gradient-text mb-6">
          {formatUsd(portfolio.totalValueUsd)}
        </p>
        <SellAllButton
          portfolioValueUsd={portfolio.totalValueUsd}
          onConfirm={sellAllPortfolio}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <TargetSellForm />
        <StopLossForm />
      </div>
    </div>
  )
}
