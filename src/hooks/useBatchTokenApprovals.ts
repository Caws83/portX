import { useCallback, useMemo } from 'react'
import { useAccount, useCapabilities, useSendCalls, useWriteContract } from 'wagmi'
import { erc20Abi, type Address } from 'viem'

import { getBundleExecutorAddress, getChainById } from '@/config/chainsRegistry'
import {
  buildExactApprovalCalls,
  resolveBatchApprovalAmount,
  type BatchApprovalCall,
  type BatchApprovalLegDef,
} from '@/services/batchExactApprovals'
import {
  parseWalletBatchCapabilities,
  type WalletBatchCapabilityResult,
} from '@/utils/walletBatchCapabilities'

export type BatchApprovalMode = 'batch' | 'sequential'

export interface UseBatchTokenApprovalsOptions {
  legs: readonly BatchApprovalLegDef[]
  chainId: number | undefined
  spender?: Address
  /** Exact approvals by default; max only when explicitly true. */
  preferMaxApproval?: boolean
  enabled?: boolean
}

export interface UseBatchTokenApprovalsResult {
  mode: BatchApprovalMode
  capabilities: WalletBatchCapabilityResult
  unsupportedReason: string | null
  calls: BatchApprovalCall[]
  isDetectingCapabilities: boolean
  isSubmitting: boolean
  /** Scaffold entry point — not wired into TransactionReviewModal yet. */
  approveAll: () => Promise<void>
}

/**
 * Feature-detected batch approval scaffold for future sell approval bundling.
 * Falls back to sequential mode when EIP-5792 batch support is unavailable.
 */
export function useBatchTokenApprovals(
  options: UseBatchTokenApprovalsOptions,
): UseBatchTokenApprovalsResult {
  const {
    legs,
    chainId,
    spender,
    preferMaxApproval = false,
    enabled = true,
  } = options

  const { address, isConnected } = useAccount()
  const chain = chainId != null ? getChainById(chainId) : undefined
  const shouldDetect =
    enabled && isConnected && chainId != null && legs.length > 0 && chain != null

  const { data: capabilities, isLoading: isDetectingCapabilities } = useCapabilities({
    account: address,
    chainId,
    query: { enabled: shouldDetect },
  })

  const capabilitiesResult = useMemo(
    () =>
      chainId != null
        ? parseWalletBatchCapabilities(capabilities, chainId)
        : {
            supportsBatchApprovals: false,
            supportsAtomicBatch: false,
            reason: 'Required chain is not set.',
          },
    [capabilities, chainId],
  )

  const mode: BatchApprovalMode = capabilitiesResult.supportsBatchApprovals
    ? 'batch'
    : 'sequential'

  const calls = useMemo(() => {
    if (chainId == null || legs.length === 0) return []
    try {
      return buildExactApprovalCalls({
        legs,
        chainId,
        spender,
        preferMaxApproval,
      })
    } catch {
      return []
    }
  }, [legs, chainId, spender, preferMaxApproval])

  const resolvedSpender = useMemo((): Address | undefined => {
    if (spender) return spender
    if (chainId == null) return undefined
    return getBundleExecutorAddress(chainId)
  }, [spender, chainId])

  const { sendCallsAsync, isPending: isSendCallsPending } = useSendCalls()
  const { writeContractAsync, isPending: isWritePending } = useWriteContract()

  const approveAll = useCallback(async () => {
    if (!isConnected || chainId == null || legs.length === 0 || !resolvedSpender) return

    if (mode === 'batch' && capabilitiesResult.supportsBatchApprovals && calls.length > 0) {
      await sendCallsAsync({
        chainId,
        calls: calls.map(({ to, data }) => ({ to, data })),
      })
      return
    }

    for (const leg of legs) {
      const amount = resolveBatchApprovalAmount(leg, preferMaxApproval)
      await writeContractAsync({
        address: leg.tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [resolvedSpender, amount],
        chainId,
      })
    }
  }, [
    isConnected,
    chainId,
    legs,
    resolvedSpender,
    mode,
    capabilitiesResult.supportsBatchApprovals,
    calls,
    sendCallsAsync,
    writeContractAsync,
    preferMaxApproval,
  ])

  return {
    mode,
    capabilities: capabilitiesResult,
    unsupportedReason: capabilitiesResult.reason,
    calls,
    isDetectingCapabilities,
    isSubmitting: isSendCallsPending || isWritePending,
    approveAll,
  }
}
