import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { useTestnetDashboardPortfolio } from '@/hooks/useTestnetDashboardPortfolio'
import {
  canPreviewTestnetMultiTokenBasketSell,
  hasTestnetMultiTokenBasketHoldings,
} from '@/utils/testnetBasketHoldings'

export function useTestnetPortfolioOwnership() {
  const portfolio = useTestnetDashboardPortfolio()
  const { isConnected } = useAccount()

  const balancesWei = portfolio.balances.balancesWei

  const ownedIds = useMemo(
    () => new Set(portfolio.activeBaskets.map((entry) => entry.basketId)),
    [portfolio.activeBaskets],
  )

  const hasBasketHoldings = useMemo(
    () => hasTestnetMultiTokenBasketHoldings(balancesWei),
    [balancesWei],
  )

  const sellEligibleIds = useMemo(() => {
    if (!ENABLE_TESTNET_MODE || !isConnected) {
      return new Set<string>()
    }
    const eligible = portfolio.activeBaskets
      .filter(({ basketId }) =>
        canPreviewTestnetMultiTokenBasketSell({
          enableTestnetMode: ENABLE_TESTNET_MODE,
          walletConnected: isConnected,
          basketId,
          balancesWei,
        }),
      )
      .map(({ basketId }) => basketId)
    return new Set(eligible)
  }, [portfolio.activeBaskets, balancesWei, isConnected])

  return {
    portfolio,
    ownedIds,
    sellEligibleIds,
    hasBasketHoldings,
    isOwned: (basketId: string) => ownedIds.has(basketId),
    canSell: (basketId: string) => sellEligibleIds.has(basketId),
  }
}
