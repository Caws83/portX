import { Link } from 'react-router-dom'
import { TrendingAddresses } from '@/components/TrendingAddresses'
import { NotablePortfolios } from '@/components/NotablePortfolios'
import { WhalePortfolioCard } from '@/components/WhalePortfolioCard'
import { WHALE_WATCH_PORTFOLIOS, DISCOVERY_DISCLAIMER } from '@/data/notablePortfolios'

export function Discover() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="section-title">Discover Portfolios</h1>
        <p className="text-portx-muted mt-1 max-w-2xl">
          Copy trending crypto portfolios in one click. Browse demo notable wallets and whale
          strategies — then save as a basket template. No trades until you preview a quote and sign
          from your wallet.
        </p>
      </div>

      <div
        className="rounded-xl border p-4 mb-10 text-sm"
        style={{
          borderColor: 'rgba(255, 170, 0, 0.4)',
          backgroundColor: 'rgba(255, 170, 0, 0.08)',
          color: '#ffaa00',
        }}
      >
        <p className="font-semibold mb-1">Risk & verification disclaimer</p>
        <p className="text-portx-muted leading-relaxed">{DISCOVERY_DISCLAIMER}</p>
      </div>

      <div className="space-y-14">
        <TrendingAddresses showViewAll={false} />

        <NotablePortfolios title="Notable Portfolios" />

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold">Whale Watch</h2>
            <p className="text-sm text-portx-muted">
              Demo whale allocations — future: on-chain whale labels via Nansen / Arkham
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {WHALE_WATCH_PORTFOLIOS.map((p) => (
              <WhalePortfolioCard key={p.id} portfolio={p} />
            ))}
          </div>
        </section>

        <section className="card-glow text-center p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-2">Copy Portfolio CTA</h2>
          <p className="text-portx-muted mb-6 max-w-xl mx-auto">
            Found a portfolio you like? Copy it as a basket template, then head to Baskets to
            preview quotes and execute when you are ready — fully non-custodial.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/baskets" className="btn-primary px-8">
              View My Baskets
            </Link>
            <Link to="/create-basket" className="btn-secondary px-8">
              Build Custom Basket
            </Link>
          </div>
          <p className="text-xs text-portx-muted mt-6">
            {/* Future: company treasury data, Etherscan tracking, real-time valuation */}
            Live wallet intelligence integrations coming in a future release.
          </p>
        </section>
      </div>
    </div>
  )
}
