import { Link } from 'react-router-dom'
import { TAGLINE } from '@/config/constants'

export function Hero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-portx-green/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="badge mb-6 mx-auto w-fit">DeFi Portfolio Trading</div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Trade portfolios
          <br />
          <span className="gradient-text">like a single asset</span>
        </h1>
        <p className="text-lg md:text-xl text-portx-muted max-w-2xl mx-auto mb-4">
          {TAGLINE} Buy, manage, and sell crypto baskets in one position — not token by token.
        </p>
        <p className="text-portx-green font-semibold text-lg mb-10">
          One click in. One click out.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/dashboard" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto">
            Launch App
          </Link>
          <Link to="/create-basket" className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto">
            Create Basket
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { label: 'One-Tx Buy', desc: 'Enter a full basket in a single flow' },
            { label: 'Portfolio P&L', desc: 'Track value and targets in one view' },
            { label: 'Smart Exits', desc: 'Take-profit & stop-loss at portfolio level' },
          ].map((item) => (
            <div key={item.label} className="card-glow text-left">
              <div className="text-portx-green font-semibold mb-1">{item.label}</div>
              <div className="text-sm text-portx-muted">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
