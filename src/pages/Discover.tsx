import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingAddresses } from '@/components/TrendingAddresses'
import { NotablePortfolios } from '@/components/NotablePortfolios'
import { WhalePortfolioCard } from '@/components/WhalePortfolioCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { useNotablePortfolios } from '@/hooks/useNotablePortfolios'
import {
  BUTTON_LABELS,
  EMPTY_MESSAGES,
  LOADING_MESSAGES,
  SUCCESS_MESSAGES,
  WARNING_MESSAGES,
} from '@/config/uiCopy'
import {
  DISCOVER_CHAIN_FILTERS,
  matchesDiscoverChainFilter,
  withDefaultChainMetadata,
  type DiscoverChainFilter,
} from '@/types/basketChain'
import type { NotablePortfolio } from '@/types/whale'

function filterPortfoliosByChain(
  portfolios: NotablePortfolio[],
  filter: DiscoverChainFilter
): NotablePortfolio[] {
  return portfolios.filter((p) => matchesDiscoverChainFilter(p.chain, filter))
}

export function Discover() {
  const {
    portfolios,
    whaleWatchPortfolios,
    disclaimer,
    loading,
    source,
    retry,
  } = useNotablePortfolios()

  const [chainFilter, setChainFilter] = useState<DiscoverChainFilter>('all')

  const normalizedPortfolios = useMemo(
    () => portfolios.map((p) => withDefaultChainMetadata(p)),
    [portfolios]
  )

  const filteredPortfolios = useMemo(
    () => filterPortfoliosByChain(normalizedPortfolios, chainFilter),
    [normalizedPortfolios, chainFilter]
  )

  const filteredWhalePortfolios = useMemo(
    () => filterPortfoliosByChain(whaleWatchPortfolios.map((p) => withDefaultChainMetadata(p)), chainFilter),
    [whaleWatchPortfolios, chainFilter]
  )

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

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted mb-2">
          Filter by chain
        </p>
        <div className="flex flex-wrap gap-2">
          {DISCOVER_CHAIN_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setChainFilter(id)}
              aria-pressed={chainFilter === id}
              className={
                chainFilter === id
                  ? 'btn-primary text-sm py-2 px-4'
                  : 'btn-secondary text-sm py-2 px-4'
              }
            >
              {label}
            </button>
          ))}
        </div>
        {chainFilter !== 'all' && !loading && (
          <p className="text-xs text-portx-muted mt-2" role="status">
            Showing {filteredPortfolios.length} notable and {filteredWhalePortfolios.length} whale
            portfolio(s) on {DISCOVER_CHAIN_FILTERS.find((f) => f.id === chainFilter)?.label}
          </p>
        )}
      </div>

      {loading && (
        <StatusBanner variant="loading" className="mb-6">
          {LOADING_MESSAGES.discover}
        </StatusBanner>
      )}

      {source === 'fallback' && !loading && (
        <StatusBanner variant="warning" className="mb-6" onRetry={retry}>
          {WARNING_MESSAGES.apiOfflineFallback('discover portfolio')}
        </StatusBanner>
      )}

      {source === 'api' && !loading && (
        <StatusBanner variant="success" className="mb-6" compact>
          {SUCCESS_MESSAGES.discoverApi}
        </StatusBanner>
      )}

      <StatusBanner variant="info" className="mb-10">
        <span>
          <strong className="block mb-1">Risk & verification disclaimer</strong>
          <span className="text-portx-muted leading-relaxed">{disclaimer}</span>
        </span>
      </StatusBanner>

      <div className="space-y-14">
        <TrendingAddresses showViewAll={false} />

        {!loading && filteredPortfolios.length === 0 ? (
          <EmptyState
            title={EMPTY_MESSAGES.noDiscoverNotable.title}
            description={EMPTY_MESSAGES.noDiscoverNotable.description}
          />
        ) : (
          !loading && (
            <NotablePortfolios title="Notable Portfolios" portfolios={filteredPortfolios} />
          )
        )}

        {!loading && (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold">Whale Watch</h2>
              <p className="text-sm text-portx-muted">
                Demo whale allocations — future: on-chain whale labels via Nansen / Arkham
              </p>
            </div>
            {filteredWhalePortfolios.length === 0 ? (
              <EmptyState
                title={EMPTY_MESSAGES.noDiscoverWhale.title}
                description={EMPTY_MESSAGES.noDiscoverWhale.description}
                className="py-8"
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                {filteredWhalePortfolios.map((p) => (
                  <WhalePortfolioCard key={p.id} portfolio={p} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="card-glow text-center p-6 sm:p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-2">Copy a portfolio template</h2>
          <p className="text-portx-muted mb-6 max-w-xl mx-auto">
            Found a portfolio you like? {BUTTON_LABELS.copyBasket}, then head to Baskets to
            preview quotes when you are ready — fully non-custodial.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/baskets" className="btn-primary px-8">
              {BUTTON_LABELS.viewBaskets}
            </Link>
            <Link to="/create-basket" className="btn-secondary px-8">
              Build Custom Basket
            </Link>
          </div>
          <p className="text-xs text-portx-muted mt-6">
            Live wallet intelligence integrations coming in a future release.
          </p>
        </section>
      </div>
    </div>
  )
}
