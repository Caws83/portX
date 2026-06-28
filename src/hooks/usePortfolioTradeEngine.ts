import {
  usePortfolioTradeContextOptional,
  type PortfolioTradeEngineValue,
} from '@/context/PortfolioTradeProvider'

export type { PortfolioTradeEngineValue }

export function usePortfolioTradeEngine(): PortfolioTradeEngineValue {
  const context = usePortfolioTradeContextOptional()
  if (!context) {
    throw new Error(
      'usePortfolioTradeEngine must be used within PortfolioTradeProvider (testnet mode only)',
    )
  }
  return context
}

/** Safe accessor when a component serves both production and testnet layouts */
export function usePortfolioTradeEngineOptional(): PortfolioTradeEngineValue | null {
  return usePortfolioTradeContextOptional()
}
