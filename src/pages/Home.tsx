import { Link } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { TrendingAddresses } from '@/components/TrendingAddresses'
import { NotablePortfolios } from '@/components/NotablePortfolios'
import { ENABLE_TESTNET_MODE } from '@/config/features'

const PLATFORM_CARDS = [
  { title: 'Dashboard', description: 'Portfolio P&L and holdings', to: '/dashboard' },
  { title: 'Baskets', description: 'Preview and execute basket trades', to: '/baskets' },
  { title: 'Create Basket', description: 'Compose custom allocations', to: '/create-basket' },
  { title: 'Sell All', description: 'Exit a full portfolio in one flow', to: '/sell-all' },
  { title: 'Discover', description: 'Copy notable portfolio templates', to: '/discover' },
  { title: 'Agents', description: 'Automated trading scripts (preview)', to: '/agents' },
  { title: 'Lending', description: 'Portfolio loan calculator preview', to: '/lending' },
  { title: 'Genesis NFT', description: 'Sepolia mint and ecosystem utility', to: '/mint' },
] as const

const ECOSYSTEM_CARDS = [
  {
    title: 'Portfolio Trading',
    description: 'One-click basket investing',
    to: '/baskets',
  },
  {
    title: 'Portfolio Loans',
    description: 'Borrow against eligible portfolios',
    to: '/lending',
  },
  {
    title: 'PortX NFT',
    description: 'Premium ecosystem access',
    to: '/mint',
  },
] as const

export function Home() {
  return (
    <div>
      <Hero />

      <section className="py-16 border-t border-portx-border bg-portx-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <TrendingAddresses limit={6} showViewAll />
          <NotablePortfolios limit={5} horizontal showViewAll />
          <div className="text-center pt-4">
            <Link to="/discover" className="btn-primary px-10 py-4 text-lg">
              Discover Portfolios
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-portx-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-3">Platform</h2>
          <p className="text-portx-muted text-center max-w-2xl mx-auto mb-10 text-sm">
            {ENABLE_TESTNET_MODE
              ? 'Portfolio trading on Sepolia — baskets, dashboard, lending preview, and Genesis NFT mint.'
              : 'Full PortX development surface — baskets, portfolio tools, lending preview, agents, and Sepolia testnet execution.'}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {PLATFORM_CARDS.map((card) => (
              <Link
                key={card.title}
                to={card.to}
                className="card-glow group block p-5 hover:border-portx-green/40 transition-colors"
              >
                <h3 className="font-bold mb-1 group-hover:text-portx-green transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-portx-muted">{card.description}</p>
              </Link>
            ))}
          </div>

          <h2 className="section-title text-center mb-4">What is PortX?</h2>
          <p className="text-portx-muted text-center max-w-3xl mx-auto mb-12">
            PortX lets you buy, manage, and sell crypto portfolios as one position instead of swapping
            tokens one by one. Compose baskets, enter with a single transaction flow, and exit the full
            portfolio — or set portfolio-level take-profit and stop-loss targets.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Basket Trading', desc: 'Buy weighted token baskets in one flow' },
              { title: 'Portfolio Dashboard', desc: 'Unified P&L across all holdings' },
              { title: 'Target Exits', desc: '2x take-profit or -20% stop-loss on the whole book' },
              { title: 'AI Agents', desc: 'Auto-trading scripts coming soon' },
            ].map((f) => (
              <div key={f.title} className="card text-center">
                <h3 className="font-bold text-portx-green mb-2">{f.title}</h3>
                <p className="text-sm text-portx-muted">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 card-glow max-w-2xl mx-auto text-center p-8">
            <p className="text-2xl font-bold mb-2">One click in. One click out.</p>
            <p className="text-portx-muted mb-6">
              Stop juggling dozens of swaps. Manage conviction like an investor.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/dashboard" className="btn-primary w-full sm:w-auto">
                Launch App
              </Link>
              <Link to="/create-basket" className="btn-secondary w-full sm:w-auto">
                Create Basket
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-portx-border bg-portx-surface/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-3">Unlock the full PortX ecosystem</h2>
          <p className="text-portx-muted text-center max-w-2xl mx-auto mb-10 text-sm">
            Trade baskets, preview portfolio loans, and mint the Genesis NFT on Sepolia — built for
            long-term ecosystem members.
          </p>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {ECOSYSTEM_CARDS.map((card) => (
              <Link
                key={card.title}
                to={card.to}
                className="card-glow group block text-center p-6 md:p-8 hover:border-portx-green/40 transition-colors"
              >
                <h3 className="font-bold text-lg mb-2 group-hover:text-portx-green transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-portx-muted">{card.description}</p>
              </Link>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/mint" className="btn-primary px-10 py-4 text-lg w-full sm:w-auto">
              Buy NFT
            </Link>
            <Link to="/lending" className="btn-secondary px-10 py-4 text-lg w-full sm:w-auto">
              Lending Preview
            </Link>
          </div>
          <p className="text-xs text-portx-muted mt-3 text-center">
            {ENABLE_TESTNET_MODE
              ? 'Sepolia Genesis NFT mint on /mint — public mint opens when goPublic is enabled on-chain.'
              : 'NFT mint coming soon — explore lending utility in preview.'}
          </p>
        </div>
      </section>

      <section className="py-16 bg-portx-surface/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-portx-muted mb-2">DEX routing (coming soon)</p>
          <div className="flex flex-wrap justify-center gap-4 text-portx-muted font-mono text-sm">
            <span className="px-4 py-2 rounded-lg border border-portx-border">0x</span>
            <span className="px-4 py-2 rounded-lg border border-portx-border">1inch</span>
            <span className="px-4 py-2 rounded-lg border border-portx-border">Uniswap</span>
          </div>
        </div>
      </section>
    </div>
  )
}
