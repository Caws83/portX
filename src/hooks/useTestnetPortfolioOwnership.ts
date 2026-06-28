import { useMemo } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { ENABLE_LIVE_EXECUTION, ENABLE_TESTNET_MODE } from '@/config/features'
import { useTestnetDashboardPortfolio } from '@/hooks/useTestnetDashboardPortfolio'
import { canShowTestnetMultiTokenBasketSell } from '@/utils/testnetBasketHoldings'

export function useTestnetPortfolioOwnership() {
  const portfolio = useTestnetDashboardPortfolio()
  const { isConnected } = useAccount()
  const chainId = useChainId()

  const ownedIds = useMemo(
    () => new Set(portfolio.activeBaskets.map((entry) => entry.basketId)),
    [portfolio.activeBaskets],
  )

  const sellEligibleIds = useMemo(() => {
    if (!ENABLE_TESTNET_MODE || !ENABLE_LIVE_EXECUTION || !isConnected) {
      return new Set<string>()
    }
    const balancesWei = portfolio.balances.balancesWei
    const eligible = portfolio.activeBaskets
      .filter(({ basketId }) =>
        canShowTestnetMultiTokenBasketSell({
          enableTestnetMode: ENABLE_TESTNET_MODE,
          enableLiveExecution: ENABLE_LIVE_EXECUTION,
          walletConnected: isConnected,
          chainId,
          basketId,
          balancesWei,
        }),
      )
      .map(({ basketId }) => basketId)
    return new Set(eligible)
  }, [portfolio.activeBaskets, portfolio.balances.balancesWei, chainId, isConnected])

  return {
    portfolio,
    ownedIds,
    sellEligibleIds,
    isOwned: (basketId: string) => ownedIds.has(basketId),
    canSell: (basketId: string) => sellEligibleIds.has(basketId),
  }
}
