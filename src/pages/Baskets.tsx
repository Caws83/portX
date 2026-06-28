import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAccount, useChainId } from 'wagmi'
import { usePortfolioStore } from '@/store/portfolioStore'
import { BasketCard } from '@/components/BasketCard'
import { MyPortfolioCard } from '@/components/MyPortfolioCard'
import { QuotePreviewCard } from '@/components/QuotePreviewCard'
import { TransactionReviewModal } from '@/components/TransactionReviewModal'
import { PortfolioRebalancePreviewModal } from '@/components/PortfolioRebalancePreviewModal'
import { ExecutionWarning } from '@/components/ExecutionWarning'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { useBasket } from '@/hooks/useBasket'
import { useQuotePreview } from '@/hooks/useQuotePreview'
import { usePortfolioTradeEngineOptional } from '@/hooks/usePortfolioTradeEngine'
import { TestnetPortfolioTradeModals } from '@/components/TestnetPortfolioTradeModals'
import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioDrift } from '@/hooks/usePortfolioDrift'
import { executeDemoPlan } from '@/services/transactionBuilder'
import { DEFAULT_BUY_AMOUNT_USD } from '@/config/constants'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { isTestnetMultiTokenBasket } from '@/data/testnetMultiTokenBasket'
import { useTestnetPortfolioBalances } from '@/hooks/useTestnetPortfolioBalances'
import { TESTNET_DASHBOARD_REFRESH_EVENT } from '@/hooks/useTestnetDashboardPortfolio'
import { assessQuoteQuality } from '@/utils/quoteQuality'
import {
  BUTTON_LABELS,
  EMPTY_MESSAGES,
  ERROR_MESSAGES,
  INFO_MESSAGES,
  LOADING_MESSAGES,
  SUCCESS_MESSAGES,
  WARNING_MESSAGES,
} from '@/config/uiCopy'
import type { Basket } from '@/types/basket'
import type { ExecutionPlan } from '@/types/execution'
import { RecentTestSwaps } from '@/components/RecentTestSwaps'
import { TESTNET_BUTTONS, SEPOLIA_PORTFOLIO_TRADE } from '@/config/testnetUxCopy'
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

import { getPlannedChainMessage } from '@/utils/chainRouting'

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

export function Baskets() {
  const location = useLocation()
  const chainId = useChainId()
  const { isConnected } = useAccount()
  const testnetBalances = useTestnetPortfolioBalances()
  const { allBaskets, basketsLoading, basketsError, basketsSource } = useBasket()
  const buyBasket = usePortfolioStore((s) => s.buyBasket)
  const sellBasket = usePortfolioStore((s) => s.sellBasket)
  const removeActiveBasket = usePortfolioStore((s) => s.removeActiveBasket)
  const testnetOwnership = useTestnetPortfolioOwnership()
  const demoActiveBaskets = usePortfolioStore((s) => s.activeBaskets)

  const [buyAmount, setBuyAmount] = useState(DEFAULT_BUY_AMOUNT_USD)
  const [localSelectedBasket, setLocalSelectedBasket] = useState<Basket | null>(null)
  const [localRebalanceBasket, setLocalRebalanceBasket] = useState<Basket | null>(null)
  const [localModalOpen, setLocalModalOpen] = useState(false)
  const [localConfirming, setLocalConfirming] = useState(false)
  const [localTxMsg, setLocalTxMsg] = useState<string | null>(null)

  const testnetTrade = usePortfolioTradeEngineOptional()
  const productionQuote = useQuotePreview()

  const activeQuote = ENABLE_TESTNET_MODE && testnetTrade ? testnetTrade : productionQuote
  const {
    preview,
    plan,
    loading,
    error,
    quoteSource,
    previewBuy,
    retryBuyQuote,
    retrySellQuote,
    previewSellBasket,
    buildPlan,
    clear,
  } = activeQuote

  const selectedBasket = ENABLE_TESTNET_MODE && testnetTrade ? testnetTrade.selectedBasket : localSelectedBasket
  const rebalanceBasket = ENABLE_TESTNET_MODE && testnetTrade ? testnetTrade.rebalanceBasket : localRebalanceBasket
  const modalOpen = ENABLE_TESTNET_MODE && testnetTrade ? testnetTrade.modalOpen : localModalOpen
  const setModalOpen = ENABLE_TESTNET_MODE && testnetTrade ? testnetTrade.setModalOpen : setLocalModalOpen
  const confirming = ENABLE_TESTNET_MODE && testnetTrade ? testnetTrade.confirming : localConfirming
  const txMsg = ENABLE_TESTNET_MODE && testnetTrade ? testnetTrade.txMsg : localTxMsg
  const setTxMsg = ENABLE_TESTNET_MODE && testnetTrade ? testnetTrade.setTxMsg : setLocalTxMsg

  const setBuyAmountForPage = (amount: number) => {
    if (ENABLE_TESTNET_MODE && testnetTrade) {
      testnetTrade.setBuyAmountUsd(amount)
      return
    }
    setBuyAmount(amount)
  }

  const buyAmountForPage =
    ENABLE_TESTNET_MODE && testnetTrade ? testnetTrade.buyAmountUsd : buyAmount

  const setSelectedBasket = (basket: Basket | null) => {
    if (ENABLE_TESTNET_MODE) {
      if (!testnetTrade) return
      if (basket === null) testnetTrade.closeTradeFlow()
      else testnetTrade.selectBasket(basket)
      return
    }
    setLocalSelectedBasket(basket)
  }

  const setRebalanceBasket = (basket: Basket | null) => {
    if (ENABLE_TESTNET_MODE) {
      if (!testnetTrade) return
      if (basket === null) testnetTrade.closeRebalancePreview()
      else testnetTrade.openRebalancePreview(basket)
      return
    }
    setLocalRebalanceBasket(basket)
  }

  const quoteQuality = useMemo(
    () => (preview && quoteSource ? assessQuoteQuality(preview, quoteSource) : null),
    [preview, quoteSource]
  )

  const ownedIds = useMemo(() => {
    if (ENABLE_TESTNET_MODE) return testnetOwnership.ownedIds
    return new Set(demoActiveBaskets.map((b) => b.basketId))
  }, [demoActiveBaskets, testnetOwnership.ownedIds])

  const testnetSellEligibleIds = testnetOwnership.sellEligibleIds

  const handleTestnetExecutionSuccess = (executedPlan: ExecutionPlan) => {
    if (ENABLE_TESTNET_MODE) {
      testnetTrade?.handleTestnetExecutionSuccess()
      return
    }
    testnetBalances.refresh()
    window.dispatchEvent(new Event(TESTNET_DASHBOARD_REFRESH_EVENT))
    if (!executedPlan.basketId) return
    if (executedPlan.type === 'sell_basket') {
      removeActiveBasket(executedPlan.basketId)
    }
  }

  const portfolio = usePortfolio()

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

  const selectPlannedBasket = (basket: Basket) => {
    clear()
    setModalOpen(false)
    setSelectedBasket(basket)
    setTxMsg(null)
  }

  const guardQuotePreview = (basket: Basket): boolean => {
    if (canShowBasketQuotes(basket)) return true
    selectPlannedBasket(basket)
    return false
  }

  const handlePreviewBuy = async (basket: Basket) => {
    if (!guardQuotePreview(basket)) return
    setSelectedBasket(basket)
    setTxMsg(null)
    if (ENABLE_TESTNET_MODE) {
      if (!testnetTrade) return
      await testnetTrade.openBuyPreview(basket)
      return
    }
    await previewBuy(basket, buyAmount)
  }

  const handlePreviewSell = async (basket: Basket) => {
    if (!guardQuotePreview(basket)) return
    setSelectedBasket(basket)
    setTxMsg(null)
    if (ENABLE_TESTNET_MODE) {
      if (!testnetTrade) return
      await testnetTrade.openSellPreview(basket)
      return
    }
    const purchase = demoActiveBaskets.find((b) => b.basketId === basket.id)
    const balancesWei =
      isTestnetMultiTokenBasket(basket.id) && isConnected
        ? Object.fromEntries(testnetBalances.assets.map((asset) => [asset.symbol, asset.balanceWei]))
        : undefined
    await previewSellBasket(basket, purchase?.amountUsd ?? 1000, balancesWei)
  }

  const handleReview = () => {
    if (!preview || !selectedBasket || !canShowBasketQuotes(selectedBasket)) return
    if (ENABLE_TESTNET_MODE) {
      testnetTrade?.openReviewModal()
      return
    }
    buildPlan(preview)
    setModalOpen(true)
  }

  const handleConfirm = async () => {
    if (!plan) return
    if (ENABLE_TESTNET_MODE) {
      if (!testnetTrade) return
      await testnetTrade.handleConfirm()
      return
    }
    setLocalConfirming(true)
    try {
      const result = await executeDemoPlan(plan)
      if (plan.type === 'buy' && plan.basketId && selectedBasket) {
        buyBasket(
          {
            basketId: plan.basketId,
            amountUsd: plan.totalInputUsd,
            purchasedAt: Date.now(),
            entryValueUsd: plan.totalInputUsd,
          },
          selectedBasket.allocations
        )
      } else if (plan.type === 'sell_basket' && plan.basketId && selectedBasket) {
        const purchase = demoActiveBaskets.find((b) => b.basketId === plan.basketId)
        sellBasket({
          basketId: plan.basketId,
          allocations: selectedBasket.allocations,
          positionValueUsd: purchase?.amountUsd ?? plan.totalInputUsd,
          entryValueUsd: purchase?.entryValueUsd,
        })
      }
      setTxMsg(result.message)
      setModalOpen(false)
      clear()
      setSelectedBasket(null)
    } finally {
      setLocalConfirming(false)
    }
  }

  const handleQuickBuy = async (basket: Basket) => {
    if (!guardQuotePreview(basket)) return
    setSelectedBasket(basket)
    const p = await previewBuy(basket, buyAmount)
    if (!p) return
    buildPlan(p)
    setModalOpen(true)
  }

  const clearSelection = () => {
    if (ENABLE_TESTNET_MODE) {
      testnetTrade?.closeTradeFlow()
      return
    }
    clear()
    setSelectedBasket(null)
    setModalOpen(false)
  }

  const showPlannedPanel =
    selectedBasket !== null && !canShowBasketQuotes(selectedBasket)
  const showQuotePreview =
    preview !== null &&
    selectedBasket !== null &&
    canShowBasketQuotes(selectedBasket)

  useEffect(() => {
    const state = location.state as BasketsLocationState | null
    if (!state?.basketId || basketsLoading) return
    const basket = allBaskets.find((b) => b.id === state.basketId)
    if (!basket) return

    if (state.action === 'sell') {
      if (ENABLE_TESTNET_MODE) void testnetTrade?.openSellPreviewAndReview(basket)
      else void handlePreviewSell(basket)
    } else if (state.action === 'rebalance') {
      setRebalanceBasket(basket)
      setSelectedBasket(basket)
    } else {
      if (ENABLE_TESTNET_MODE) void testnetTrade?.openBuyPreviewAndReview(basket)
      else void handlePreviewBuy(basket)
    }

    window.history.replaceState({}, document.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when deep-link state arrives
  }, [location.state, basketsLoading, allBaskets.length])

  const renderBasketCard = (basket: Basket, sectionKey?: BasketCatalogSection) => {
    if (ENABLE_TESTNET_MODE && sectionKey === 'my-portfolios') {
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
          onBuyMore={() => void testnetTrade?.openBuyPreviewAndReview(basket)}
          onSell={() => void testnetTrade?.openSellPreviewAndReview(basket)}
          onRebalance={() => testnetTrade?.openRebalancePreview(basket)}
          actionLoading={
            (testnetTrade?.loading ?? false) && testnetTrade?.selectedBasket?.id === basket.id
          }
        />
      )
    }

    return (
    <BasketCard
      key={basket.id}
      basket={basket}
      onPreviewBuy={handlePreviewBuy}
      onPreviewSell={handlePreviewSell}
      onPreviewRebalance={
        ownedIds.has(basket.id) || testnetSellEligibleIds.has(basket.id)
          ? () => setRebalanceBasket(basket)
          : undefined
      }
      canRebalance={ownedIds.has(basket.id) || testnetSellEligibleIds.has(basket.id)}
      onBuy={ENABLE_TESTNET_MODE ? undefined : handleQuickBuy}
      onPlannedChainSelect={selectPlannedBasket}
      isOwned={ownedIds.has(basket.id)}
      canPreviewSell={testnetSellEligibleIds.has(basket.id) || ownedIds.has(basket.id)}
      driftStatus={
        ownedIds.has(basket.id) ? getDriftForBasket(basket.id)?.status : undefined
      }
      loading={loading && selectedBasket?.id === basket.id}
      isSelected={
        selectedBasket?.id === basket.id && (showQuotePreview || showPlannedPanel)
      }
    />
    )
  }

  const showTestnetEnvWarning = shouldShowTestnetEnvWarning(chainId, isConnected)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="section-title">Crypto Baskets</h1>
        <p className="text-portx-muted mt-1">
          {ENABLE_TESTNET_MODE
            ? `${SEPOLIA_PORTFOLIO_TRADE} — preview and execute portfolio trades on Sepolia.`
            : 'Preview routed quotes on Ethereum mainnet — planned chains show routing status only.'}
        </p>
      </div>

      {!ENABLE_TESTNET_MODE ? (
        <ExecutionWarning variant="info" warnings={[INFO_MESSAGES.demoMode]} />
      ) : null}

      {ENABLE_TESTNET_MODE && ownedIds.size > 0 ? (
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
            value={buyAmountForPage}
            onChange={(e) => setBuyAmountForPage(parseFloat(e.target.value) || 0)}
            className="input-field max-w-xs font-mono w-full"
            disabled={showPlannedPanel}
            aria-disabled={showPlannedPanel}
          />
        </div>
        <p className="text-xs text-portx-muted sm:max-w-md">
          Example: ${buyAmountForPage.toLocaleString()} USDC into an Ethereum basket splits across
          allocation legs, each quoted independently. Planned-chain baskets do not request quotes.
        </p>
      </div>

      {basketsLoading && (
        <StatusBanner variant="loading" className="mb-6">
          {LOADING_MESSAGES.baskets}
        </StatusBanner>
      )}

      {basketsError && basketsSource === 'fallback' && !basketsLoading && (
        <StatusBanner variant="warning" className="mb-6">
          {WARNING_MESSAGES.apiOfflineFallback('basket')} ({basketsError})
        </StatusBanner>
      )}

      {basketsSource === 'api' && !basketsLoading && !ENABLE_TESTNET_MODE && (
        <StatusBanner variant="success" className="mb-6" compact>
          {SUCCESS_MESSAGES.basketsApi}
        </StatusBanner>
      )}

      {loading && (
        <StatusBanner variant="loading" className="mb-6">
          {LOADING_MESSAGES.quotePreview}
        </StatusBanner>
      )}

      {quoteSource === 'fallback' && preview && !loading && (
        <StatusBanner
          variant="warning"
          className="mb-6"
          onRetry={() =>
            void (preview.type === 'sell_basket' ? retrySellQuote() : retryBuyQuote())
          }
        >
          {preview.type === 'sell_basket'
            ? WARNING_MESSAGES.sellBasketFallback
            : WARNING_MESSAGES.quoteFallback}
        </StatusBanner>
      )}

      {quoteSource === 'api' && preview && !loading && quoteQuality && (
        <StatusBanner
          variant={quoteQuality.kind === 'live_0x' ? 'success' : 'warning'}
          className="mb-6"
          compact
        >
          {quoteQuality.bannerMessage}
        </StatusBanner>
      )}

      {quoteSource === 'testnet' && preview && !loading && (
        <StatusBanner variant="info" className="mb-6" compact>
          {preview.type === 'sell_basket'
            ? 'Sepolia preview quote — wallet holdings priced to USDC via Uniswap V3.'
            : 'Sepolia preview quote — Uniswap V3 routing on Sepolia testnet.'}
        </StatusBanner>
      )}

      {error && (
        <StatusBanner variant="error" className="mb-6">
          {error || ERROR_MESSAGES.quoteFailed}
        </StatusBanner>
      )}

      {txMsg && (
        <StatusBanner variant="success" className="mb-6">
          {txMsg}
        </StatusBanner>
      )}

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 min-w-0 space-y-10">
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
                    {sectionKey === 'testnet' && ENABLE_TESTNET_MODE && (
                      <p className="text-sm text-portx-muted mt-1">
                        Live Sepolia portfolio trades when execution gates pass.
                      </p>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    {sectionBaskets.map((basket) => renderBasketCard(basket, sectionKey))}
                  </div>
                </section>
              )
            })
          )}
        </div>

        <div className="lg:col-span-1 min-w-0">
          {showPlannedPanel && selectedBasket ? (
            <div className="sticky top-24 space-y-3">
              <div className="card-glow border-portx-warning/40 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-portx-warning mb-2">
                  {WARNING_MESSAGES.plannedChainBlocked}
                </p>
                <h3 className="text-lg font-bold mb-1">{selectedBasket.name}</h3>
                <p className="text-sm text-portx-muted mb-4">
                  {selectedBasket.chainLabel} · {selectedBasket.chainStatus}
                </p>
                <ExecutionWarning
                  variant="warning"
                  warnings={[getPlannedChainMessage(selectedBasket)]}
                />
                <p className="text-xs text-portx-muted mt-4">
                  No quote API call was made. Transaction review and execution readiness are not
                  available until {selectedBasket.chainLabel} routing is live.
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="btn-secondary w-full text-sm"
              >
                {BUTTON_LABELS.clearSelection}
              </button>
            </div>
          ) : showQuotePreview && preview ? (
            <div className="sticky top-24">
              <QuotePreviewCard
                preview={preview}
                quoteSource={quoteSource}
                onReview={handleReview}
                loading={loading}
                reviewLabel={
                  quoteSource === 'testnet'
                    ? preview.type === 'sell_basket'
                      ? TESTNET_BUTTONS.reviewSell
                      : TESTNET_BUTTONS.reviewTrade
                    : BUTTON_LABELS.reviewExecute
                }
              />
              <button
                type="button"
                onClick={clearSelection}
                className="btn-secondary w-full mt-3 text-sm"
              >
                {BUTTON_LABELS.clearPreview}
              </button>
            </div>
          ) : (
            <EmptyState
              title={EMPTY_MESSAGES.noQuotePreview.title}
              description={EMPTY_MESSAGES.noQuotePreview.description}
            />
          )}
        </div>
      </div>

      <RecentTestSwaps className="mt-8" compact />

      {ENABLE_TESTNET_MODE ? (
        <TestnetPortfolioTradeModals
          rebalanceDrift={
            testnetTrade?.rebalanceBasket
              ? getDriftForBasket(testnetTrade.rebalanceBasket.id)
              : null
          }
        />
      ) : (
        <>
          <TransactionReviewModal
            plan={plan}
            quoteSource={quoteSource}
            open={modalOpen && showQuotePreview}
            onClose={() => setModalOpen(false)}
            onConfirm={handleConfirm}
            confirming={confirming}
            onTestnetExecutionSuccess={handleTestnetExecutionSuccess}
          />

          <PortfolioRebalancePreviewModal
            open={rebalanceBasket !== null}
            basket={rebalanceBasket}
            drift={rebalanceBasket ? getDriftForBasket(rebalanceBasket.id) : null}
            onClose={() => setRebalanceBasket(null)}
          />
        </>
      )}
    </div>
  )
}
