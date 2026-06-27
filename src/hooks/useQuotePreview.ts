import { useState, useCallback, useRef } from 'react'
import { useAccount, useChainId } from 'wagmi'
import type { Basket } from '@/types/basket'
import type { HeldToken } from '@/types/portfolio'
import type { BasketQuotePreview } from '@/types/quote'
import type { ExecutionPlan } from '@/types/execution'
import { DEFAULT_SLIPPAGE_BPS, DEFAULT_STABLECOIN } from '@/config/constants'
import { ENABLE_LIVE_EXECUTION, ENABLE_TESTNET_MODE } from '@/config/features'
import { TESTNET_SEPOLIA_CHAIN_ID } from '@/config/testnetExecution'
import {
  previewBuyBasket,
  mapBuyBasketResponseToPreview,
  previewSellBasket as fetchSellBasketQuote,
  mapSellBasketResponseToPreview,
  DEMO_QUOTE_WALLET,
} from '@/api/quotes'
import {
  getLocalBuyBasketQuotePreview,
  getSellBasketQuotePreview,
  getSellAllQuotePreview,
} from '@/services/quoteEngine'
import { buildTestnetEthToUsdcBasketPreview } from '@/services/testnetUniswapQuote'
import {
  buildTestnetMultiTokenBasketPreview,
  shouldUseMultiTokenTestnetQuote,
} from '@/services/testnetMultiTokenQuote'
import { buildTestnetMultiTokenSellPreview } from '@/services/testnetMultiTokenSellQuote'
import { isTestnetMultiTokenBasket } from '@/data/testnetMultiTokenBasket'
import { buildExecutionPlan } from '@/services/transactionBuilder'
import { canPreviewQuoteForBasket } from '@/utils/chainRouting'

export type QuoteSource = 'api' | 'fallback' | 'testnet' | null

function shouldUseTestnetUniswapQuote(chainId: number): boolean {
  return (
    ENABLE_TESTNET_MODE &&
    ENABLE_LIVE_EXECUTION &&
    chainId === TESTNET_SEPOLIA_CHAIN_ID
  )
}

function loadSlippage(): number {
  try {
    const raw = localStorage.getItem('portx-settings')
    if (raw) return JSON.parse(raw).slippageBps ?? DEFAULT_SLIPPAGE_BPS
  } catch {
    /* ignore */
  }
  return DEFAULT_SLIPPAGE_BPS
}

export function useQuotePreview() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [preview, setPreview] = useState<BasketQuotePreview | null>(null)
  const [plan, setPlan] = useState<ExecutionPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoteSource, setQuoteSource] = useState<QuoteSource>(null)
  const lastBuyRef = useRef<{ basket: Basket; amountUsd: number } | null>(null)
  const lastSellRef = useRef<{
    basket: Basket
    positionValueUsd: number
    balancesWei?: Record<string, bigint>
  } | null>(null)

  const getParams = useCallback(
    () => ({
      chainId,
      walletAddress: address ?? DEMO_QUOTE_WALLET,
      slippageBps: loadSlippage(),
    }),
    [chainId, address]
  )

  const previewBuy = useCallback(
    async (basket: Basket, amountUsd: number) => {
      setLoading(true)
      setError(null)
      setPlan(null)
      setQuoteSource(null)
      lastBuyRef.current = { basket, amountUsd }

      const params = getParams()

      try {
        if (ENABLE_TESTNET_MODE && ENABLE_LIVE_EXECUTION && params.chainId !== TESTNET_SEPOLIA_CHAIN_ID) {
          setError('Switch wallet to Sepolia (chain 11155111) for testnet basket preview.')
          return null
        }

        if (shouldUseTestnetUniswapQuote(params.chainId)) {
          if (!canPreviewQuoteForBasket(basket)) {
            setError('Testnet preview is only available for active Ethereum baskets.')
            return null
          }

          const previewParams = {
            basketId: basket.id,
            basketName: basket.name,
            slippageBps: params.slippageBps,
            allocations: basket.allocations,
          }

          const result = shouldUseMultiTokenTestnetQuote(basket.allocations)
            ? await buildTestnetMultiTokenBasketPreview(
                previewParams,
                address as `0x${string}` | undefined,
              )
            : await buildTestnetEthToUsdcBasketPreview(
                previewParams,
                address as `0x${string}` | undefined,
              )
          setPreview(result)
          setQuoteSource('testnet')
          return result
        }

        const response = await previewBuyBasket({
          walletAddress: params.walletAddress,
          chainId: params.chainId,
          inputToken: DEFAULT_STABLECOIN,
          inputAmountUsd: amountUsd,
          basketId: basket.id,
          slippageBps: params.slippageBps,
        })
        const result = mapBuyBasketResponseToPreview(
          response,
          params.chainId,
          params.slippageBps,
          DEFAULT_STABLECOIN
        )
        setPreview(result)
        setQuoteSource('api')
        return result
      } catch (apiErr) {
        console.warn(
          '[PortX] Buy-basket quote API unavailable — using local quote fallback.',
          apiErr
        )
        try {
          const result = await getLocalBuyBasketQuotePreview(basket, amountUsd, params)
          setPreview(result)
          setQuoteSource('fallback')
          return result
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Quote failed'
          setError(msg)
          setQuoteSource(null)
          return null
        }
      } finally {
        setLoading(false)
      }
    },
    [getParams]
  )

  const retryBuyQuote = useCallback(async () => {
    const last = lastBuyRef.current
    if (!last) return null
    return previewBuy(last.basket, last.amountUsd)
  }, [previewBuy])

  const previewSellBasket = useCallback(
    async (
      basket: Basket,
      positionValueUsd: number,
      balancesWei?: Record<string, bigint>,
    ) => {
      setLoading(true)
      setError(null)
      setPlan(null)
      setQuoteSource(null)
      lastSellRef.current = { basket, positionValueUsd, balancesWei }

      const params = getParams()

      try {
        if (ENABLE_TESTNET_MODE && ENABLE_LIVE_EXECUTION && params.chainId !== TESTNET_SEPOLIA_CHAIN_ID) {
          setError('Switch wallet to Sepolia (chain 11155111) for testnet basket sell preview.')
          return null
        }

        if (
          shouldUseTestnetUniswapQuote(params.chainId) &&
          isTestnetMultiTokenBasket(basket.id)
        ) {
          if (!canPreviewQuoteForBasket(basket)) {
            setError('Testnet sell preview is only available for active Ethereum baskets.')
            return null
          }

          if (!balancesWei) {
            setError('Wallet token balances are required for Sepolia multi-token sell preview.')
            return null
          }

          const result = await buildTestnetMultiTokenSellPreview({
            basketId: basket.id,
            basketName: basket.name,
            slippageBps: params.slippageBps,
            allocations: basket.allocations,
            balancesWei,
            recipient: address as `0x${string}` | undefined,
          })
          setPreview(result)
          setQuoteSource('testnet')
          return result
        }

        const response = await fetchSellBasketQuote({
          walletAddress: params.walletAddress,
          chainId: params.chainId,
          basketId: basket.id,
          outputToken: DEFAULT_STABLECOIN,
          slippageBps: params.slippageBps,
          positionValueUsd,
        })
        const result = mapSellBasketResponseToPreview(
          response,
          params.chainId,
          params.slippageBps,
          DEFAULT_STABLECOIN
        )
        setPreview(result)
        setQuoteSource('api')
        return result
      } catch (apiErr) {
        if (shouldUseTestnetUniswapQuote(params.chainId) && isTestnetMultiTokenBasket(basket.id)) {
          const msg = apiErr instanceof Error ? apiErr.message : 'Testnet sell quote failed'
          setError(msg)
          setQuoteSource(null)
          return null
        }

        console.warn(
          '[PortX] Sell-basket quote API unavailable — using local quote fallback.',
          apiErr
        )
        try {
          const result = await getSellBasketQuotePreview(basket, positionValueUsd, params)
          setPreview(result)
          setQuoteSource('fallback')
          return result
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Quote failed'
          setError(msg)
          setQuoteSource(null)
          return null
        }
      } finally {
        setLoading(false)
      }
    },
    [getParams, address]
  )

  const retrySellQuote = useCallback(async () => {
    const last = lastSellRef.current
    if (!last) return null
    return previewSellBasket(last.basket, last.positionValueUsd, last.balancesWei)
  }, [previewSellBasket])

  const previewSellAll = useCallback(
    async (holdings: HeldToken[]) => {
      setLoading(true)
      setError(null)
      setPlan(null)
      setQuoteSource(null)
      try {
        const result = await getSellAllQuotePreview(holdings, getParams())
        setPreview(result)
        return result
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Quote failed'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [getParams]
  )

  const buildPlan = useCallback(
    (quotePreview: BasketQuotePreview) => {
      const execPlan = buildExecutionPlan(quotePreview, address)
      setPlan(execPlan)
      return execPlan
    },
    [address]
  )

  const clear = useCallback(() => {
    setPreview(null)
    setPlan(null)
    setError(null)
    setQuoteSource(null)
    lastBuyRef.current = null
    lastSellRef.current = null
  }, [])

  return {
    preview,
    plan,
    loading,
    error,
    quoteSource,
    previewBuy,
    retryBuyQuote,
    previewSellBasket,
    retrySellQuote,
    previewSellAll,
    buildPlan,
    clear,
  }
}
