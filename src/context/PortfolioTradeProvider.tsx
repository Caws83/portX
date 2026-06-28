import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_BUY_AMOUNT_USD } from '@/config/constants'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import {
  useTestnetPortfolioTradeActions,
  type UseTestnetPortfolioTradeActionsOptions,
} from '@/hooks/useTestnetPortfolioTradeActions'
import { useTestnetPortfolioOwnership } from '@/hooks/useTestnetPortfolioOwnership'

type TestnetPortfolioTradeActionsReturn = ReturnType<typeof useTestnetPortfolioTradeActions>

export interface PortfolioTradeEngineValue extends TestnetPortfolioTradeActionsReturn {
  /** Refresh on-chain portfolio balances and local execution aggregate */
  refresh: () => void
  buyAmountUsd: number
  setBuyAmountUsd: (amount: number) => void
}

const PortfolioTradeContext = createContext<PortfolioTradeEngineValue | null>(null)

function PortfolioTradeProviderActive({ children }: { children: ReactNode }) {
  const [buyAmountUsd, setBuyAmountUsd] = useState(DEFAULT_BUY_AMOUNT_USD)
  const { portfolio } = useTestnetPortfolioOwnership()
  const tradeOptions = useMemo(
    (): UseTestnetPortfolioTradeActionsOptions => ({ buyAmountUsd }),
    [buyAmountUsd],
  )
  const trade = useTestnetPortfolioTradeActions(tradeOptions)

  const value = useMemo(
    (): PortfolioTradeEngineValue => ({
      ...trade,
      refresh: portfolio.refresh,
      buyAmountUsd,
      setBuyAmountUsd,
    }),
    [trade, portfolio.refresh, buyAmountUsd],
  )

  return (
    <PortfolioTradeContext.Provider value={value}>{children}</PortfolioTradeContext.Provider>
  )
}

/** App-level testnet trade state — no-op passthrough when not in testnet mode */
export function PortfolioTradeProvider({ children }: { children: ReactNode }) {
  if (!ENABLE_TESTNET_MODE) {
    return (
      <PortfolioTradeContext.Provider value={null}>{children}</PortfolioTradeContext.Provider>
    )
  }

  return <PortfolioTradeProviderActive>{children}</PortfolioTradeProviderActive>
}

export function usePortfolioTradeContextOptional(): PortfolioTradeEngineValue | null {
  return useContext(PortfolioTradeContext)
}
