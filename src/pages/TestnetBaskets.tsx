import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAccount, useChainId } from 'wagmi'
import { BasketCard } from '@/components/BasketCard'
import { MyPortfolioCard } from '@/components/MyPortfolioCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { useBasket } from '@/hooks/useBasket'
import { usePortfolioTradeEngine } from '@/hooks/usePortfolioTradeEngine'
import { TestnetPortfolioTradeModals } from '@/components/TestnetPortfolioTradeModals'
import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioDrift } from '@/hooks/usePortfolioDrift'
import {
  EMPTY_MESSAGES,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
} from '@/config/uiCopy'
import type { Basket } from '@/types/basket'
import { RecentTestSwaps } from '@/components/RecentTestSwaps'
import { SEPOLIA_PORTFOLIO_TRADE } from '@/config/testnetUxCopy'
import {
  shouldShowTestnetEnvWarning,
  TESTNET_EXECUTION_ENV_MESSAGE,
} from '@/utils/testnetQuoteRouting'
import { useTestnetPortfolioOwnership } from '@/hooks/useTestnetPortfolioOwnership'
import {
  BASKET_SECTION_LABELS,
  canShowBasketQuotes,
  estimateBasketHoldingsValueUsd,
  groupBasketsBySection,
  type BasketCatalogSection,
} from '@/utils/basketCatalog'

interface BasketsLocationState {
  basketId?: string
  action?: 'buy' | 'sell' | 'rebalance'
}

const CATALOG_SECTION_ORDER: BasketCatalogSection[] = [
  'my-portfolios',
  'featured',
  'sport-fan',
  'community',
]

export function TestnetBaskets() {
  const location = useLocation()
  const chainId = useChainId()
  const { isConnected } = useAccount()
  const trade = usePortfolioTradeEngine()
  const testnetOwnership = useTestnetPortfolioOwnership()
  const { allBaskets, basketsLoading, basketsError, basketsSource } = useBasket()
  const portfolio = usePortfolio()

  const ownedIds = testnetOwnership.ownedIds
  const testnetSellEligibleIds = testnetOwnership.sellEligibleIds

  const catalogSections = useMemo(
    () => groupBasketsBySection(allBaskets, ownedIds),
    [allBaskets, ownedIds],
  )

  const ownedBasketInputs = useMemo(
    () =>
      [...ownedIds]
        .map((basketId) => {
          const basket = allBaskets.find((b) => b.id === basketId)
          return basket ? { basket, basketId } : null
        })
        .filter((entry): entry is { basket: Basket; basketId: string } => entry !== null),
    [ownedIds, allBaskets],
  )

  const { getDriftForBasket } = usePortfolioDrift(portfolio.heldTokens, ownedBasketInputs)

  const openBuyReview = (basket: Basket) => {
    if (!canShowBasketQuotes(basket)) return
    void trade.openBuyPreviewAndReview(basket)
  }

  const openSellReview = (basket: Basket) => {
    if (!canShowBasketQuotes(basket)) return
    void trade.openSellPreviewAndReview(basket)
  }

  useEffect(() => {
    const state = location.state as BasketsLocationState | null
    if (!state?.basketId || basketsLoading) return
    const basket = allBaskets.find((b) => b.id === state.basketId)
    if (!basket) return

    if (state.action === 'sell') {
      void trade.openSellPreviewAndReview(basket)
    } else if (state.action === 'rebalance') {
      trade.openRebalancePreview(basket)
    } else {
      void trade.openBuyPreviewAndReview(basket)
    }

    window.history.replaceState({}, document.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when deep-link state arrives
  }, [location.state, basketsLoading, allBaskets.length])

  const renderBasketCard = (basket: Basket, sectionKey?: BasketCatalogSection) => {
    if (sectionKey === 'my-portfolios') {
      const estimatedValueUsd = estimateBasketHoldingsValueUsd(
        basket,
        testnetOwnership.portfolio.walletAssets,
      )
      return (
        <MyPortfolioCard
          key={basket.id}
          basket={basket}
          basketId={basket.id}
          estimatedValueUsd={estimatedValueUsd}
          ownershipNote="Detected from on-chain Sepolia holdings"
          canSell={testnetOwnership.canSell(basket.id)}
          tokenBalances={testnetOwnership.portfolio.walletAssets.map((asset) => ({
            symbol: asset.symbol,
            balanceDisplay: asset.balanceDisplay,
            estimatedValueDisplay: asset.estimatedValueDisplay,
          }))}
          onBuyMore={() => openBuyReview(basket)}
          onSell={() => openSellReview(basket)}
          onRebalance={() => trade.openRebalancePreview(basket)}
          actionLoading={trade.loading && trade.selectedBasket?.id === basket.id}
        />
      )
    }

    const isOwned = ownedIds.has(basket.id)
    const canSell = testnetSellEligibleIds.has(basket.id) || isOwned

    return (
      <BasketCard
        key={basket.id}
        basket={basket}
        onPreviewBuy={openBuyReview}
        onPreviewSell={canSell ? openSellReview : undefined}
        onPreviewRebalance={
          canSell ? (b) => trade.openRebalancePreview(b) : undefined
        }
        canRebalance={canSell}
        isOwned={isOwned}
        canPreviewSell={canSell}
        driftStatus={isOwned ? getDriftForBasket(basket.id)?.status : undefined}
        loading={trade.loading && trade.selectedBasket?.id === basket.id}
        isSelected={false}
      />
    )
  }

  const showTestnetEnvWarning = shouldShowTestnetEnvWarning(chainId, isConnected)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="section-title">Crypto Baskets</h1>
        <p className="text-portx-muted mt-1">
          {SEPOLIA_PORTFOLIO_TRADE} — preview and execute portfolio trades on Sepolia.
        </p>
      </div>

      {ownedIds.size > 0 ? (
        <StatusBanner variant="info" className="mb-6" compact>
          You own {ownedIds.size} portfolio{ownedIds.size === 1 ? '' : 's'} — detected from Sepolia
          wallet holdings.
        </StatusBanner>
      ) : null}

      {showTestnetEnvWarning ? (
        <StatusBanner variant="warning" className="mb-6" compact>
          {TESTNET_EXECUTION_ENV_MESSAGE}
        </StatusBanner>
      ) : null}

      <div className="mt-6 mb-8 card flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1 min-w-0">
          <label className="label" htmlFor="buy-amount">
            Basket buy amount (USDC)
          </label>
          <input
            id="buy-amount"
            type="number"
            min={100}
            step={100}
            value={trade.buyAmountUsd}
            onChange={(e) => trade.setBuyAmountUsd(parseFloat(e.target.value) || 0)}
            className="input-field max-w-xs font-mono w-full"
          />
        </div>
        <p className="text-xs text-portx-muted sm:max-w-md">
          Default amount for the next buy: ${trade.buyAmountUsd.toLocaleString()}. You choose the
          exact amount in the buy step before review.
        </p>
      </div>

      {basketsLoading && (
        <StatusBanner variant="loading" className="mb-6">
          {LOADING_MESSAGES.baskets}
        </StatusBanner>
      )}

      {basketsError && basketsSource === 'fallback' && !basketsLoading && (
        <StatusBanner variant="warning" className="mb-6">
          Basket catalog loaded from local fallback ({basketsError})
        </StatusBanner>
      )}

      {trade.loading && (
        <StatusBanner variant="loading" className="mb-6">
          {LOADING_MESSAGES.quotePreview}
        </StatusBanner>
      )}

      {trade.quoteSource === 'testnet' && trade.preview && !trade.loading && (
        <StatusBanner variant="info" className="mb-6" compact>
          {trade.preview.type === 'sell_basket'
            ? 'Sepolia preview quote — wallet holdings priced to USDC via Uniswap V3.'
            : 'Sepolia preview quote — Uniswap V3 routing on Sepolia testnet.'}
        </StatusBanner>
      )}

      {trade.error && (
        <StatusBanner variant="error" className="mb-6">
          {trade.error || ERROR_MESSAGES.quoteFailed}
        </StatusBanner>
      )}

      {trade.txMsg && (
        <StatusBanner variant="success" className="mb-6">
          {trade.txMsg}
        </StatusBanner>
      )}

      <div className="space-y-10">
        {!basketsLoading && allBaskets.length === 0 ? (
          <EmptyState
            title={EMPTY_MESSAGES.noBaskets.title}
            description={EMPTY_MESSAGES.noBaskets.description}
          />
        ) : (
          !basketsLoading &&
          CATALOG_SECTION_ORDER.map((sectionKey) => {
            const sectionBaskets = catalogSections[sectionKey]
            if (sectionBaskets.length === 0) return null
            return (
              <section key={sectionKey}>
                <div className="mb-4">
                  <h2 className="text-xl font-bold">{BASKET_SECTION_LABELS[sectionKey]}</h2>
                  {sectionKey === 'sport-fan' && (
                    <p className="text-sm text-portx-muted mt-1">
                      Preview templates — Sport & Fan Token routing is planned.
                    </p>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {sectionBaskets.map((basket) => renderBasketCard(basket, sectionKey))}
                </div>
              </section>
            )
          })
        )}
      </div>

      <RecentTestSwaps className="mt-8" compact />

      <TestnetPortfolioTradeModals
        rebalanceDrift={
          trade.rebalanceBasket ? getDriftForBasket(trade.rebalanceBasket.id) : null
        }
      />
    </div>
  )
}
