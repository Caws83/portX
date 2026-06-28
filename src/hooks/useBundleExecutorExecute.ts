import { useCallback, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { simulateContract, waitForTransactionReceipt } from 'wagmi/actions'
import { sepolia } from 'viem/chains'
import type { Hex } from 'viem'
import { getExplorerTxUrl } from '@/config/networks'
import { formatTestnetExecutionError } from '@/utils/bundleExecutorErrors'
import { wagmiConfig } from '@/config/wagmi'
import {
  BUNDLE_EXECUTOR_EXECUTE_ABI,
  getBundleExecutorAddress,
  type ExecuteBundleParams,
} from '@/services/bundleExecutorContract'

export type BundleExecutorExecuteStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UseBundleExecutorExecuteResult {
  status: BundleExecutorExecuteStatus
  txHash?: Hex
  explorerUrl?: string
  errorMessage?: string
  isWritePending: boolean
  executeBundle: (params: ExecuteBundleParams) => Promise<void>
  reset: () => void
}

export function useBundleExecutorExecute(): UseBundleExecutorExecuteResult {
  const { address } = useAccount()
  const { writeContractAsync, isPending: isWritePending } = useWriteContract()

  const [status, setStatus] = useState<BundleExecutorExecuteStatus>('idle')
  const [txHash, setTxHash] = useState<Hex | undefined>()
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  const sepoliaChainId = sepolia.id
  const explorerUrl = txHash ? getExplorerTxUrl(sepoliaChainId, txHash) : undefined

  const reset = useCallback(() => {
    setStatus('idle')
    setTxHash(undefined)
    setErrorMessage(undefined)
  }, [])

  const executeBundle = useCallback(
    async (params: ExecuteBundleParams) => {
      setStatus('pending')
      setTxHash(undefined)
      setErrorMessage(undefined)

      try {
        const contractAddress = getBundleExecutorAddress()

        if (address) {
          await simulateContract(wagmiConfig, {
            address: contractAddress,
            abi: BUNDLE_EXECUTOR_EXECUTE_ABI,
            functionName: 'executeBasket',
            args: [params.basketId, params.swaps],
            value: params.value,
            account: address,
            chainId: sepoliaChainId,
          })
        }

        const hash = await writeContractAsync({
          address: contractAddress,
          abi: BUNDLE_EXECUTOR_EXECUTE_ABI,
          functionName: 'executeBasket',
          args: [params.basketId, params.swaps],
          value: params.value,
          chainId: sepoliaChainId,
        })

        setTxHash(hash)

        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
        if (receipt.status === 'reverted') {
          setStatus('error')
          setErrorMessage('Transaction reverted on-chain')
          return
        }

        setStatus('success')
      } catch (error) {
        setStatus('error')
        setErrorMessage(formatTestnetExecutionError(error))
      }
    },
    [address, sepoliaChainId, writeContractAsync],
  )

  return {
    status: status === 'pending' || isWritePending ? 'pending' : status,
    txHash,
    explorerUrl,
    errorMessage,
    isWritePending,
    executeBundle,
    reset,
  }
}
