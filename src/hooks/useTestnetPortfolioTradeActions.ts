import { useCallback, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import type { Basket } from '@/types/basket'
import { DEFAULT_BUY_AMOUNT_USD } from '@/config/constants'
import { TESTNET_MULTI_TOKEN_BASKET, TESTNET_MULTI_TOKEN_BASKET_ID, isTestnetMultiTokenBasket } from '@/data/testnetMultiTokenBasket'
import { useBasket } from '@/hooks/useBasket'
import { useQuotePreview } from '@/hooks/useQuotePreview'
import { useTestnetPortfolioOwnership } from '@/hooks/useTestnetPortfolioOwnership'
import { executeDemoPlan } from '@/services/transactionBuilder'
import { usePortfolioStore } from '@/store/portfolioStore'
import { canShowBasketQuotes, estimateBasketHoldingsValueUsd } from '@/utils/basketCatalog'
import { TESTNET_DASHBOARD_REFRESH_EVENT } from '@/hooks/useTestnetDashboardPortfolio'
import {
  isWalletOnRequiredTradeChain,
  resolveRequiredTradeChain,
} from '@/utils/tradeChainResolution'

export interface UseTestnetPortfolioTradeActionsOptions {
  buyAmountUsd?: number
  onBuyAmountUsdChange?: (amount: number) => void
}

export function useTestnetPortfolioTradeActions(
  options: UseTestnetPortfolioTradeActionsOptions = {},
) {
  const { getBasketById } = useBasket()
  const { portfolio } = useTestnetPortfolioOwnership()
  const demoActiveBaskets = usePortfolioStore((s) => s.activeBaskets)
  const buyBasket = usePortfolioStore((s) => s.buyBasket)
  const sellBasket = usePortfolioStore((s) => s.sellBasket)

  const buyAmount = options.buyAmountUsd ?? DEFAULT_BUY_AMOUNT_USD
  const onBuyAmountUsdChange = options.onBuyAmountUsdChange

  const quote = useQuotePreview()
  const { isConnected } = useAccount()
  const walletChainId = useChainId()
  const [selectedBasket, setSelectedBasket] = useState<Basket | null>(null)
  const [pendingBuyBasket, setPendingBuyBasket] = useState<Basket | null>(null)
  const [buyAmountModalOpen, setBuyAmountModalOpen] = useState(false)
  const [chainGateBasket, setChainGateBasket] = useState<Basket | null>(null)
  const [pendingChainGateAction, setPendingChainGateAction] = useState<(() => void) | null>(null)
  const [rebalanceBasket, setRebalanceBasket] = useState<Basket | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [txMsg, setTxMsg] = useState<string | null>(null)

  const resolveBasket = useCallback(
    (basketId: string): Basket | undefined => {
      return getBasketById(basketId) ?? (basketId === TESTNET_MULTI_TOKEN_BASKET_ID ? TESTNET_MULTI_TOKEN_BASKET : undefined)
    },
    [getBasketById],
  )

  const getBalancesWei = useCallback((): Record<string, bigint> => {
    return Object.fromEntries(
      portfolio.balances.assets.map((asset) => [asset.symbol, asset.balanceWei]),
    )
  }, [portfolio.balances.assets])

  const getSellPositionValueUsd = useCallback(
    (basket: Basket): number => {
      const purchase = demoActiveBaskets.find((b) => b.basketId === basket.id)
      if (purchase?.amountUsd) return purchase.amountUsd
      const estimated = estimateBasketHoldingsValueUsd(basket, portfolio.walletAssets)
      return Math.max(estimated, 100)
    },
    [demoActiveBaskets, portfolio.walletAssets],
  )

  const guardQuotePreview = useCallback((basket: Basket): boolean => {
    return canShowBasketQuotes(basket)
  }, [])

  const guardWalletChain = useCallback(
    (basket: Basket, onReady: () => void): boolean => {
      const required = resolveRequiredTradeChain({ selectedBasket: basket })
      if (
        isConnected &&
        !isWalletOnRequiredTradeChain(walletChainId, required.chainId, isConnected)
      ) {
        setChainGateBasket(basket)
        setPendingChainGateAction(() => onReady)
        return false
      }
      return true
    },
    [isConnected, walletChainId],
  )

  const dismissChainGate = useCallback(() => {
    setChainGateBasket(null)
    setPendingChainGateAction(null)
  }, [])

  const continueAfterChainGate = useCallback(() => {
    const action = pendingChainGateAction
    dismissChainGate()
    action?.()
  }, [pendingChainGateAction, dismissChainGate])

  const openBuyAmountSelector = useCallback(
    (basketOrId: Basket | string) => {
      const basket = typeof basketOrId === 'string' ? resolveBasket(basketOrId) : basketOrId
      if (!basket || !guardQuotePreview(basket)) return
  const startBuyFlow = () => {
        quote.clear()
        setSelectedBasket(basket)
        setPendingBuyBasket(basket)
        setTxMsg(null)
        setBuyAmountModalOpen(true)
      }
      if (!guardWalletChain(basket, startBuyFlow)) return
      startBuyFlow()
    },
    [resolveBasket, guardQuotePreview, guardWalletChain],
  )

  const closeBuyAmountSelector = useCallback(() => {
    setBuyAmountModalOpen(false)
    setPendingBuyBasket(null)
  }, [])

  const confirmBuyAmountAndReview = useCallback(
    async (amountUsd: number) => {
      const basket = pendingBuyBasket
      if (!basket) return
      const runPreview = async () => {
        quote.clear()
        onBuyAmountUsdChange?.(amountUsd)
        setBuyAmountModalOpen(false)
        setPendingBuyBasket(null)
        setSelectedBasket(basket)
        setTxMsg(null)
        const preview = await quote.previewBuy(basket, amountUsd)
        if (!preview) return
        quote.buildPlan(preview)
        setModalOpen(true)
      }
      if (!guardWalletChain(basket, () => void runPreview())) return
      await runPreview()
    },
    [pendingBuyBasket, onBuyAmountUsdChange, quote, guardWalletChain],
  )

  const openBuyPreview = useCallback(
    async (basketOrId: Basket | string) => {
      openBuyAmountSelector(basketOrId)
    },
    [openBuyAmountSelector],
  )

  const openSellPreview = useCallback(
    async (basketOrId: Basket | string) => {
      const basket = typeof basketOrId === 'string' ? resolveBasket(basketOrId) : basketOrId
      if (!basket || !guardQuotePreview(basket)) return
      setSelectedBasket(basket)
      setTxMsg(null)
      const balancesWei = isTestnetMultiTokenBasket(basket.id) ? getBalancesWei() : undefined
      await quote.previewSellBasket(basket, getSellPositionValueUsd(basket), balancesWei)
    },
    [resolveBasket, guardQuotePreview, quote, getBalancesWei, getSellPositionValueUsd],
  )

  const openBuyPreviewAndReview = useCallback(
    async (basketOrId: Basket | string) => {
      openBuyAmountSelector(basketOrId)
    },
    [openBuyAmountSelector],
  )

  const openSellPreviewAndReview = useCallback(
    async (basketOrId: Basket | string) => {
      const basket = typeof basketOrId === 'string' ? resolveBasket(basketOrId) : basketOrId
      if (!basket || !guardQuotePreview(basket)) return
      const runSellPreview = async () => {
        setSelectedBasket(basket)
        setTxMsg(null)
        const balancesWei = isTestnetMultiTokenBasket(basket.id) ? getBalancesWei() : undefined
        const preview = await quote.previewSellBasket(
          basket,
          getSellPositionValueUsd(basket),
          balancesWei,
        )
        if (!preview) return
        quote.buildPlan(preview)
        setModalOpen(true)
      }
      if (!guardWalletChain(basket, () => void runSellPreview())) return
      await runSellPreview()
    },
    [resolveBasket, guardQuotePreview, quote, getBalancesWei, getSellPositionValueUsd, guardWalletChain],
  )

  const openRebalancePreview = useCallback(
    (basketOrId: Basket | string) => {
      const basket = typeof basketOrId === 'string' ? resolveBasket(basketOrId) : basketOrId
      if (!basket) return
      setRebalanceBasket(basket)
      setSelectedBasket(basket)
    },
    [resolveBasket],
  )

  const openReviewModal = useCallback(() => {
    if (!quote.preview || !selectedBasket) return
    const openModal = () => {
      quote.buildPlan(quote.preview!)
      setModalOpen(true)
    }
    if (!guardWalletChain(selectedBasket, openModal)) return
    openModal()
  }, [quote, selectedBasket, guardWalletChain])

  const closeTradeFlow = useCallback(() => {
    quote.clear()
    setSelectedBasket(null)
    setModalOpen(false)
    setBuyAmountModalOpen(false)
    setPendingBuyBasket(null)
  }, [quote])

  const selectBasket = useCallback((basket: Basket | null) => {
    setSelectedBasket(basket)
  }, [])

  const closeRebalancePreview = useCallback(() => {
    setRebalanceBasket(null)
  }, [])

  const handleTestnetExecutionSuccess = useCallback(() => {
    portfolio.refresh()
    window.dispatchEvent(new Event(TESTNET_DASHBOARD_REFRESH_EVENT))
    quote.clear()
    setSelectedBasket(null)
    setModalOpen(false)
    setBuyAmountModalOpen(false)
    setPendingBuyBasket(null)
    setTxMsg(null)
  }, [portfolio, quote])

  const handleConfirm = useCallback(async () => {
    if (!quote.plan) return
    setConfirming(true)
    try {
      const result = await executeDemoPlan(quote.plan)
      if (quote.plan.type === 'buy' && quote.plan.basketId && selectedBasket) {
        buyBasket(
          {
            basketId: quote.plan.basketId,
            amountUsd: quote.plan.totalInputUsd,
            purchasedAt: Date.now(),
            entryValueUsd: quote.plan.totalInputUsd,
          },
          selectedBasket.allocations,
        )
      } else if (quote.plan.type === 'sell_basket' && quote.plan.basketId && selectedBasket) {
        const purchase = demoActiveBaskets.find((b) => b.basketId === quote.plan!.basketId)
        sellBasket({
          basketId: quote.plan.basketId,
          allocations: selectedBasket.allocations,
          positionValueUsd: purchase?.amountUsd ?? quote.plan.totalInputUsd,
          entryValueUsd: purchase?.entryValueUsd,
        })
      }
      setTxMsg(result.message)
      setModalOpen(false)
      quote.clear()
      setSelectedBasket(null)
    } finally {
      setConfirming(false)
    }
  }, [quote, selectedBasket, buyBasket, sellBasket, demoActiveBaskets])

  const showQuotePreview = useMemo(
    () =>
      quote.preview !== null &&
      selectedBasket !== null &&
      canShowBasketQuotes(selectedBasket),
    [quote.preview, selectedBasket],
  )

  return {
    ...quote,
    selectedBasket,
    rebalanceBasket,
    modalOpen,
    setModalOpen,
    confirming,
    txMsg,
    setTxMsg,
    showQuotePreview,
    buyAmountModalOpen,
    pendingBuyBasket,
    buyAmountUsd: buyAmount,
    chainGateBasket,
    dismissChainGate,
    continueAfterChainGate,
    resolveBasket,
    getBalancesWei,
    openBuyPreview,
    openSellPreview,
    openBuyPreviewAndReview,
    openBuyAmountSelector,
    closeBuyAmountSelector,
    confirmBuyAmountAndReview,
    openSellPreviewAndReview,
    openRebalancePreview,
    openReviewModal,
    closeTradeFlow,
    closeRebalancePreview,
    selectBasket,
    handleConfirm,
    handleTestnetExecutionSuccess,
  }
}
