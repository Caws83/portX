import { useQuery } from '@tanstack/react-query'
import { useAccount, useChainId } from 'wagmi'
import { BUNDLE_EXECUTOR_SEPOLIA } from '@/config/contracts'
import { getNetworkByChainId } from '@/config/networks'
import {
  fetchBundleExecutorReadStatus,
  getBundleExecutorAddress,
  getBundleExecutorChainId,
} from '@/services/bundleExecutorContract'

export type BundleExecutorHealthStatus = 'disconnected' | 'wrong-network' | 'ready'

export interface BundleExecutorHealth {
  status: BundleExecutorHealthStatus
  statusMessage?: string
  connectedNetwork: string
  contractAddress: string
  ownerAddress?: string
  contractReachable?: boolean
  isLoading: boolean
  error?: Error
}

export function useBundleExecutorHealth(): BundleExecutorHealth {
  const { isConnected } = useAccount()
  const walletChainId = useChainId()
  const targetChainId = getBundleExecutorChainId()

  const status: BundleExecutorHealthStatus = !isConnected
    ? 'disconnected'
    : walletChainId !== targetChainId
      ? 'wrong-network'
      : 'ready'

  const connectedNetwork = isConnected
    ? (getNetworkByChainId(walletChainId)?.label ?? `Chain ${walletChainId}`)
    : '—'

  const query = useQuery({
    queryKey: ['bundleExecutor', 'health', targetChainId],
    queryFn: fetchBundleExecutorReadStatus,
    enabled: status === 'ready',
    staleTime: 30_000,
    retry: 1,
  })

  if (status === 'disconnected') {
    return {
      status,
      statusMessage: 'Wallet not connected',
      connectedNetwork,
      contractAddress: getBundleExecutorAddress(),
      isLoading: false,
    }
  }

  if (status === 'wrong-network') {
    return {
      status,
      statusMessage: 'Wrong network',
      connectedNetwork,
      contractAddress: getBundleExecutorAddress(),
      contractReachable: false,
      isLoading: false,
    }
  }

  return {
    status,
    connectedNetwork,
    contractAddress: getBundleExecutorAddress(),
    ownerAddress: query.data?.owner,
    contractReachable: query.isSuccess ? query.data.reachable : query.isError ? false : undefined,
    isLoading: query.isLoading,
    error: query.error ?? undefined,
  }
}

export function getExpectedBundleExecutorNetworkLabel(): string {
  return BUNDLE_EXECUTOR_SEPOLIA.networkLabel
}
