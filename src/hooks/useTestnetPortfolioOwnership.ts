import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { TESTNET_MULTI_TOKEN_BASKET_ID } from '@/data/testnetMultiTokenBasket'
import { useTestnetDashboardPortfolio } from '@/hooks/useTestnetDashboardPortfolio'
import {
  getTestnetOwnedBasketIds,
  getTestnetSellableBasketIds,
  hasMeaningfulTestnetBasketHoldings,
  isTestnetMultiTokenBasketOwned,
} from '@/utils/testnetOwnedPortfolio'

export function useTestnetPortfolioOwnership() {
  const portfolio = useTestnetDashboardPortfolio()
  const { isConnected } = useAccount()

  const balancesWei = portfolio.balances.balancesWei

  const hasBasketHoldings = useMemo(
    () => hasMeaningfulTestnetBasketHoldings(balancesWei),
    [balancesWei],
  )

  const ownedIds = useMemo(() => {
    const fromHoldings = getTestnetOwnedBasketIds(balancesWei)
    for (const entry of portfolio.activeBaskets) {
      fromHoldings.add(entry.basketId)
    }
    return fromHoldings
  }, [balancesWei, portfolio.activeBaskets])

  const sellEligibleIds = useMemo(
    () => getTestnetSellableBasketIds(balancesWei),
    [balancesWei],
  )

  return {
    portfolio,
    ownedIds,
    sellEligibleIds,
    hasBasketHoldings,
    isOwned: (basketId: string) =>
      ownedIds.has(basketId) || isTestnetMultiTokenBasketOwned(basketId, balancesWei),
    canSell: (basketId: string) =>
      ENABLE_TESTNET_MODE &&
      basketId === TESTNET_MULTI_TOKEN_BASKET_ID &&
      hasMeaningfulTestnetBasketHoldings(balancesWei),
    walletConnected: isConnected,
  }
}
