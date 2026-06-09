import { useMemo } from 'react'
import { useAccount, useChainId } from 'wagmi'
import {
  getTestnetExecutionReadiness,
  type TestnetExecutionReadiness,
} from '@/services/bundleExecutorWrite'

/** Testnet execution readiness for Settings — validation scaffold only; no writes */
export function useBundleExecutorExecutionReadiness(): TestnetExecutionReadiness {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()

  return useMemo(
    () =>
      getTestnetExecutionReadiness({
        walletConnected: isConnected,
        chainId,
        walletAddress: address,
        quotePreview: null,
      }),
    [isConnected, chainId, address],
  )
}
