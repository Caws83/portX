import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingAddresses } from '@/components/TrendingAddresses'
import { NotablePortfolios } from '@/components/NotablePortfolios'
import { WhalePortfolioCard } from '@/components/WhalePortfolioCard'
import { ChainLogo } from '@/components/TokenLogo'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { useNotablePortfolios } from '@/hooks/useNotablePortfolios'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { DISCOVER_CATEGORY_PILLS, inferBasketCategoryFromTag } from '@/utils/basketCatalog'
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
import type { BasketCategory } from '@/types/basket'
import type { NotablePortfolio } from '@/types/whale'

function filterPortfoliosByChain(
  portfolios: NotablePortfolio[],
  filter: DiscoverChainFilter,
): NotablePortfolio[] {
  return portfolios.filter((p) => matchesDiscoverChainFilter(p.chain, filter))
}

function filterPortfoliosByCategory(
  portfolios: NotablePortfolio[],
  category: BasketCategory | 'all',
): NotablePortfolio[] {
  if (category === 'all') return portfolios
  return portfolios.filter((p) => {
    const inferred = inferBasketCategoryFromTag(p.category)
    if (category === 'institutional') {
      return p.category.toLowerCase().includes('institutional') || p.category.toLowerCase().includes('corporate')
    }
    if (category === 'whale') {
      return p.sourceType === 'whale_watch' || p.category.toLowerCase().includes('whale')
    }
    if (category === 'sport-fan') {
      return p.tags?.some((t) => /sport|fan|esports|motorsport|gaming/i.test(t)) ?? false
    }
    return inferred === category || p.tags?.some((t) => t.toLowerCase().includes(category))
  })
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
  const [categoryFilter, setCategoryFilter] = useState<BasketCategory | 'all'>('all')

  const normalizedPortfolios = useMemo(
    () => portfolios.map((p) => withDefaultChainMetadata(p)),
    [portfolios],
  )

  const filteredPortfolios = useMemo(() => {
    const byChain = filterPortfoliosByChain(normalizedPortfolios, chainFilter)
    return filterPortfoliosByCategory(byChain, categoryFilter)
  }, [normalizedPortfolios, chainFilter, categoryFilter])

  const filteredWhalePortfolios = useMemo(() => {
    const whales = filterPortfoliosByChain(
      whaleWatchPortfolios.map((p) => withDefaultChainMetadata(p)),
      chainFilter,
    )
    return filterPortfoliosByCategory(whales, categoryFilter)
  }, [whaleWatchPortfolios, chainFilter, categoryFilter])

  const introCopy = ENABLE_TESTNET_MODE
    ? 'Browse portfolio templates and copy them into Baskets. Sepolia portfolios trade on-chain when execution is enabled.'
    : 'Browse portfolio templates and copy them into Baskets. Preview quotes when you are ready — fully non-custodial.'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="section-title">Discover Portfolios</h1>
        <p className="text-portx-muted mt-1 max-w-2xl">{introCopy}</p>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted mb-2">
          Category
        </p>
        <div className="flex flex-wrap gap-2">
          {DISCOVER_CATEGORY_PILLS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategoryFilter(id)}
              aria-pressed={categoryFilter === id}
              className={
                categoryFilter === id
                  ? 'btn-primary text-sm py-2 px-4'
                  : 'btn-secondary text-sm py-2 px-4'
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted mb-2">
          Chain
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
              <ChainLogo chain={id === 'all' ? 'ethereum' : id} label={label} />
            </button>
          ))}
        </div>
        {(chainFilter !== 'all' || categoryFilter !== 'all') && !loading && (
          <p className="text-xs text-portx-muted mt-2" role="status">
            Showing {filteredPortfolios.length} notable and {filteredWhalePortfolios.length} whale
            portfolio(s)
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

      {source === 'api' && !loading && !ENABLE_TESTNET_MODE && (
        <StatusBanner variant="success" className="mb-6" compact>
          {SUCCESS_MESSAGES.discoverApi}
        </StatusBanner>
      )}

      <StatusBanner variant="info" className="mb-10">
        <span>
          <strong className="block mb-1">Portfolio templates</strong>
          <span className="text-portx-muted leading-relaxed">
            {ENABLE_TESTNET_MODE
              ? 'Copied templates appear in Baskets. Only Sepolia Multi-Token Beta supports live testnet execution today.'
              : disclaimer}
          </span>
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
                Large wallet allocation templates — copy to build your own basket
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
          <h2 className="text-2xl font-bold mb-2">Build from a template</h2>
          <p className="text-portx-muted mb-6 max-w-xl mx-auto">
            Copy a portfolio you like, then preview and trade from Baskets when you are ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/baskets" className="btn-primary px-8">
              {BUTTON_LABELS.viewBaskets}
            </Link>
            <Link to="/create-basket" className="btn-secondary px-8">
              Build Custom Basket
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
