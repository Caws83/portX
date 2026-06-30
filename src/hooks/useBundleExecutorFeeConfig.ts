import { useQuery } from '@tanstack/react-query'
import {
  getBundleExecutorChainId,
  readBundleExecutorFeeConfig,
  type BundleExecutorFeeConfig,
} from '@/services/bundleExecutorContract'

export interface BundleExecutorFeeConfigState {
  config: BundleExecutorFeeConfig | null
  isLoading: boolean
  isAvailable: boolean
}

/** Read-only protocol fee settings from Sepolia BundleExecutor — no fee calculations */
export function useBundleExecutorFeeConfig(): BundleExecutorFeeConfigState {
  const targetChainId = getBundleExecutorChainId()

  const query = useQuery({
    queryKey: ['bundleExecutor', 'feeConfig', targetChainId],
    queryFn: readBundleExecutorFeeConfig,
    staleTime: 30_000,
    retry: 1,
  })

  return {
    config: query.data ?? null,
    isLoading: query.isLoading,
    isAvailable: query.isSuccess && query.data !== null,
  }
}

export function formatFeeBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}
