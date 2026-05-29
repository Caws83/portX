import { Link } from 'react-router-dom'
import { Hero } from '@/components/Hero'

export function Home() {
  return (
    <div>
      <Hero />

      <section className="py-20 border-t border-portx-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <Link to="/dashboard" className="btn-primary">
              Open Dashboard
            </Link>
          </div>
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
