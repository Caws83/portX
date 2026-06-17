import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FEE_TIERS_BY_TERM,
  LENDING_PORTFOLIO_EXAMPLES,
  LENDING_STEPS,
  LIQUIDATION_LEVELS,
  LOAN_TERM_OPTIONS,
  LOAN_TIERS,
  LTV_TIER_OPTIONS,
  NFT_HOLDER_LTV_BOOST,
  NFT_UTILITY_BENEFITS,
  PREVIEW_FOOTNOTE,
  WAITLIST_MAILTO,
  type LoanTermDays,
  type LtvTierId,
} from '@/data/lendingPreview'
import { formatUsd } from '@/utils/format'

function formatPercent(value: number): string {
  return `${value}%`
}

const PORTFOLIO_ACCENT: Record<
  (typeof LENDING_PORTFOLIO_EXAMPLES)[number]['accent'],
  string
> = {
  green: 'from-portx-green/20 to-portx-green/5 border-portx-green/30',
  blue: 'from-portx-blue/20 to-portx-blue/5 border-portx-blue/30',
  cyan: 'from-cyan-400/20 to-cyan-400/5 border-cyan-400/30',
}

export function Lending() {
  const [portfolioValue, setPortfolioValue] = useState(10_000)
  const [ltvTierId, setLtvTierId] = useState<LtvTierId>('standard')
  const [loanTermDays, setLoanTermDays] = useState<LoanTermDays>(90)
  const [nftHolder, setNftHolder] = useState(false)

  const ltvTier = LTV_TIER_OPTIONS.find((t) => t.id === ltvTierId) ?? LTV_TIER_OPTIONS[1]
  const effectiveLtv = nftHolder
    ? Math.min(ltvTier.ltv + NFT_HOLDER_LTV_BOOST, 70)
    : ltvTier.ltv

  const estimatedBorrowLimit = useMemo(
    () => Math.round(portfolioValue * (effectiveLtv / 100)),
    [portfolioValue, effectiveLtv]
  )

  const feeTier = FEE_TIERS_BY_TERM[loanTermDays]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Hero */}
      <section className="mb-14">
        <div className="card-glow relative overflow-hidden p-8 md:p-12">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 20% 0%, rgba(0,255,136,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(0,212,255,0.1), transparent 50%)',
            }}
          />
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-portx-green/30 bg-portx-green/10 text-portx-green mb-5">
              Portfolio Loans · Coming Soon
            </span>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Unlock liquidity{' '}
              <span className="gradient-text">without selling your portfolio</span>
            </h1>

            <p className="mt-5 text-lg md:text-xl text-white/80 leading-relaxed">
              Borrow USDC against eligible PortX baskets while keeping market exposure.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href={WAITLIST_MAILTO} className="btn-primary text-sm md:text-base">
                Join Lending Waitlist
              </a>
              <Link to="/baskets" className="btn-secondary text-sm md:text-base">
                View Eligible Baskets
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-14">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold">How it works</h2>
          <p className="text-portx-muted text-sm mt-1 max-w-2xl">
            A non-custodial flow designed for portfolio-backed USDC loans — preview before launch.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LENDING_STEPS.map(({ step, title, description }) => (
            <div
              key={step}
              className="card relative overflow-hidden border-portx-border/80 hover:border-portx-green/30 transition-colors"
            >
              <span className="absolute top-4 right-4 text-4xl font-bold text-white/5 select-none">
                {step}
              </span>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-portx-green/20 to-portx-blue/10 text-portx-green text-sm font-bold border border-portx-green/25">
                  {step}
                </span>
                <h3 className="font-semibold text-sm leading-snug pr-6">{title}</h3>
              </div>
              <p className="text-sm text-portx-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Loan calculator */}
      <section className="mb-14">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Loan calculator</h2>
          <p className="text-portx-muted text-sm mt-1 max-w-2xl">
            Explore illustrative limits — UI preview only, no loans are created.
          </p>
        </div>

        <div className="card-glow p-6 md:p-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-portx-muted">
                Inputs
              </p>

              <div>
                <label htmlFor="lending-portfolio-value" className="label">
                  Portfolio value
                </label>
                <input
                  id="lending-portfolio-value"
                  type="range"
                  min={1_000}
                  max={50_000}
                  step={500}
                  value={portfolioValue}
                  onChange={(e) => setPortfolioValue(Number(e.target.value))}
                  className="w-full accent-portx-green"
                />
                <p className="mt-2 text-2xl font-bold font-mono gradient-text">
                  {formatUsd(portfolioValue)}
                </p>
              </div>

              <div>
                <span className="label">LTV tier</span>
                <div className="flex flex-wrap gap-2">
                  {LTV_TIER_OPTIONS.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setLtvTierId(tier.id)}
                      aria-pressed={ltvTierId === tier.id}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        ltvTierId === tier.id
                          ? 'border-portx-green bg-portx-green/10 text-portx-green shadow-glow'
                          : 'border-portx-border bg-portx-surface text-portx-muted hover:text-white hover:border-portx-green/30'
                      }`}
                    >
                      {tier.label}{' '}
                      <span className="font-mono text-xs opacity-80">({tier.ltv}%)</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="label">Loan term</span>
                <div className="flex flex-wrap gap-2">
                  {LOAN_TERM_OPTIONS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setLoanTermDays(days)}
                      aria-pressed={loanTermDays === days}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        loanTermDays === days
                          ? 'border-portx-blue bg-portx-blue/10 text-portx-blue'
                          : 'border-portx-border bg-portx-surface text-portx-muted hover:text-white'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-portx-border bg-portx-surface px-4 py-3 cursor-pointer hover:border-portx-green/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">NFT holder</p>
                  <p className="text-xs text-portx-muted mt-0.5">
                    Enhanced LTV &amp; fee tier preview
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={nftHolder}
                  onClick={() => setNftHolder((v) => !v)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    nftHolder ? 'bg-portx-green' : 'bg-portx-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      nftHolder ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Outputs */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-portx-muted">
                Preview outputs
              </p>

              <div className="rounded-2xl border border-portx-green/30 bg-gradient-to-br from-portx-green/10 to-transparent p-5">
                <p className="text-sm text-portx-muted">Estimated borrow limit</p>
                <p className="text-3xl md:text-4xl font-bold font-mono text-portx-green mt-1">
                  {formatUsd(estimatedBorrowLimit)}
                </p>
                <p className="text-xs text-portx-muted mt-2 font-mono">
                  {formatUsd(portfolioValue)} × {formatPercent(effectiveLtv)} LTV
                  {nftHolder ? ' · NFT enhanced' : ''}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-portx-border bg-portx-surface/80 p-4">
                  <p className="text-xs text-portx-muted uppercase tracking-wide">
                    Repayment window
                  </p>
                  <p className="font-semibold mt-1">{loanTermDays} days</p>
                  <p className="text-xs text-portx-muted mt-1">Illustrative term preview</p>
                </div>
                <div className="rounded-xl border border-portx-border bg-portx-surface/80 p-4">
                  <p className="text-xs text-portx-muted uppercase tracking-wide">Fee tier</p>
                  <p className="font-semibold mt-1">{feeTier.label}</p>
                  <p className="text-xs text-portx-green mt-1 font-mono">
                    {nftHolder ? feeTier.nftRate : feeTier.standardRate}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2 text-portx-muted">Liquidation levels</p>
                <div className="space-y-2">
                  {LIQUIDATION_LEVELS.map(({ ltv, title }) => (
                    <div
                      key={ltv}
                      className="flex items-center justify-between rounded-lg border border-portx-border/80 bg-portx-surface/50 px-3 py-2 text-sm"
                    >
                      <span className="text-portx-muted">{title}</span>
                      <span className="font-mono font-medium text-white/90">
                        {formatPercent(ltv)} LTV
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loan tiers */}
      <section className="mb-14">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Loan tiers</h2>
          <p className="text-portx-muted text-sm mt-1 max-w-2xl">
            Planned access levels at launch — illustrative and subject to protocol approval.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {LOAN_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`card relative flex flex-col h-full ${
                tier.highlight
                  ? 'border-portx-green/40 ring-1 ring-portx-green/20 bg-gradient-to-b from-portx-green/5 to-transparent'
                  : ''
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-4 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-portx-green text-portx-black">
                  Popular preview
                </span>
              )}
              <h3 className="font-bold text-lg">{tier.name}</h3>
              <p className="text-sm text-portx-muted mt-1">{tier.tagline}</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm">
                    <span className="text-portx-green mt-0.5 shrink-0">✓</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-portx-muted mt-4 pt-4 border-t border-portx-border">
                {tier.footnote}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* NFT utility */}
      <section className="mb-14">
        <div className="card-glow p-6 md:p-8 overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 80% at 100% 50%, rgba(0,212,255,0.15), transparent 60%)',
            }}
          />
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-bold">
              NFT holders get <span className="gradient-text">stronger lending power</span>
            </h2>
            <p className="text-portx-muted text-sm mt-2 max-w-2xl">
              Holder benefits preview — not live until protocol testing and audit complete.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {NFT_UTILITY_BENEFITS.map(({ title, description }) => (
                <div
                  key={title}
                  className="rounded-xl border border-portx-border/80 bg-portx-surface/60 p-4 hover:border-portx-blue/30 transition-colors"
                >
                  <h3 className="font-semibold text-sm">{title}</h3>
                  <p className="text-xs text-portx-muted mt-2 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Eligible portfolios */}
      <section className="mb-14">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Eligible portfolio previews</h2>
          <p className="text-portx-muted text-sm mt-1 max-w-2xl">
            Example baskets with illustrative borrow limits at preview LTVs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {LENDING_PORTFOLIO_EXAMPLES.map((example) => (
            <div
              key={example.id}
              className={`rounded-2xl border bg-gradient-to-br p-6 flex flex-col ${PORTFOLIO_ACCENT[example.accent]}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-bold">{example.name}</h3>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white/10 text-portx-green border border-portx-green/25">
                  Eligible preview
                </span>
              </div>
              <p className="text-sm text-portx-muted mb-5 flex-1">{example.description}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-portx-muted">Value</p>
                  <p className="font-mono font-semibold text-sm mt-0.5">
                    {formatUsd(example.portfolioValueUsd)}
                  </p>
                </div>
                <div className="rounded-lg bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-portx-muted">
                    Standard LTV
                  </p>
                  <p className="font-mono font-semibold text-sm mt-0.5">
                    {formatPercent(example.standardLtvPercent)}
                  </p>
                </div>
                <div className="rounded-lg bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-portx-muted">
                    Borrow limit
                  </p>
                  <p className="font-mono font-semibold text-sm mt-0.5 text-portx-green">
                    {formatUsd(example.borrowLimitUsd)}
                  </p>
                </div>
                <div className="rounded-lg bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-portx-muted">
                    NFT holder
                  </p>
                  <p className="font-mono font-semibold text-sm mt-0.5 text-portx-blue">
                    up to {formatUsd(example.nftHolderBorrowLimitUsd)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Risk levels */}
      <section className="mb-14">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Transparent risk levels</h2>
          <p className="text-portx-muted text-sm mt-1 max-w-2xl">
            Risk levels are shown early so users understand their loan health before any automated
            action.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {LIQUIDATION_LEVELS.map(({ ltv, title, description, accent }) => (
            <div
              key={ltv}
              className={`card border-t-2 ${
                accent === 'warning'
                  ? 'border-t-portx-warning/80'
                  : accent === 'caution'
                    ? 'border-t-orange-400/80'
                    : 'border-t-portx-danger/80'
              }`}
            >
              <p className="font-mono text-2xl font-bold text-white/90">{formatPercent(ltv)}</p>
              <p className="text-xs uppercase tracking-wide text-portx-muted mt-1">LTV</p>
              <h3 className="font-semibold mt-3">{title}</h3>
              <p className="text-sm text-portx-muted mt-2">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card-glow text-center p-8 md:p-12 mb-8 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0,255,136,0.1), transparent 70%)',
          }}
        />
        <div className="relative z-10">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-portx-green mb-3">
            Coming Soon
          </span>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Be first in line for PortX Portfolio Loans
          </h2>
          <p className="text-portx-muted text-sm max-w-lg mx-auto mb-8">
            Join the waitlist for launch updates. Protocol testing and audit before go-live.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={WAITLIST_MAILTO} className="btn-primary w-full sm:w-auto">
              Join Lending Waitlist
            </a>
            <Link to="/baskets" className="btn-secondary w-full sm:w-auto">
              View Eligible Baskets
            </Link>
          </div>
        </div>
      </section>

      {/* Preview footnote */}
      <footer className="rounded-xl border border-portx-border/60 bg-portx-surface/40 px-5 py-4 text-center">
        <p className="text-xs text-portx-muted leading-relaxed max-w-3xl mx-auto">
          {PREVIEW_FOOTNOTE}
        </p>
      </footer>
    </div>
  )
}
