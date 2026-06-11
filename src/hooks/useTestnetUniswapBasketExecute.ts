import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { simulateContract } from 'wagmi/actions'
import type { Hex } from 'viem'
import { formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import { wagmiConfig } from '@/config/wagmi'
import { TESTNET_DEFAULT_SWAP_AMOUNT_WEI } from '@/config/testnetExecution'
import type { ExecutionPlan } from '@/types/execution'
import {
  BUNDLE_EXECUTOR_EXECUTE_ABI,
  getBundleExecutorAddress,
  type ExecuteBundleParams,
} from '@/services/bundleExecutorContract'
import {
  assessTestnetUniswapBasketExecution,
  finalizeTestnetExecutionAssessment,
} from '@/services/testnetExecutionSafety'
import { executionPlanToQuotePreview } from '@/services/bundleExecutorWrite'
import { useBundleExecutorExecute } from '@/hooks/useBundleExecutorExecute'
import { useBundleExecutorHealth } from '@/hooks/useBundleExecutorHealth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { isTestnetSepoliaUniswapPlan } from '@/utils/testnetPreview'

export const TESTNET_UNISWAP_CONFIRMATION_MESSAGE =
  'Testnet only: sends 0.0001 Sepolia ETH through BundleExecutor to Uniswap V3. ' +
  'This is a real on-chain transaction using test ETH. Continue?'

export type TestnetUniswapBasketExecuteStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UseTestnetUniswapBasketExecuteResult {
  isTestnetUniswapPlan: boolean
  gates: ReturnType<typeof finalizeTestnetExecutionAssessment>['gates']
  canExecute: boolean
  disabledReason: string | null
  simulating: boolean
  status: TestnetUniswapBasketExecuteStatus
  txHash?: Hex
  explorerUrl?: string
  errorMessage?: string
  execute: () => Promise<void>
  reset: () => void
}

async function simulateBundleExecution(
  params: ExecuteBundleParams,
  account: `0x${string}`,
): Promise<{ passed: boolean; message: string }> {
  try {
    await simulateContract(wagmiConfig, {
      address: getBundleExecutorAddress(),
      abi: BUNDLE_EXECUTOR_EXECUTE_ABI,
      functionName: 'executeBasket',
      args: [params.basketId, params.swaps],
      value: params.value,
      account,
      chainId: sepolia.id,
    })
    return { passed: true, message: 'Static simulation succeeded' }
  } catch (error) {
    return {
      passed: false,
      message: error instanceof Error ? error.message : 'Static simulation failed',
    }
  }
}

export function useTestnetUniswapBasketExecute(
  plan: ExecutionPlan | null,
  open: boolean,
): UseTestnetUniswapBasketExecuteResult {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { enableLiveExecution, enableTestnetMode } = useFeatureFlags()
  const contractHealth = useBundleExecutorHealth()
  const {
    status: executeStatus,
    txHash,
    explorerUrl,
    errorMessage,
    isWritePending,
    executeBundle,
    reset: resetExecute,
  } = useBundleExecutorExecute()

  const [simulation, setSimulation] = useState<{ passed: boolean; message: string } | null>(null)
  const [simulating, setSimulating] = useState(false)

  const isTestnetUniswapPlan = useMemo(
    () => (plan ? isTestnetSepoliaUniswapPlan(plan) : false),
    [plan],
  )

  const bundleQuotePreview = useMemo(
    () => (plan && open && !plan.isDemo ? executionPlanToQuotePreview(plan) : null),
    [plan, open],
  )

  const baseAssessment = useMemo(() => {
    if (!plan || !open || !bundleQuotePreview || !isTestnetUniswapPlan) return null
    return assessTestnetUniswapBasketExecution(plan, bundleQuotePreview, {
      enableTestnetMode,
      enableLiveExecution,
      walletConnected: isConnected && Boolean(address),
      chainId,
      walletAddress: address,
      contractReachable: contractHealth.contractReachable === true,
      contractReachableLoading: contractHealth.isLoading,
    })
  }, [
    plan,
    open,
    bundleQuotePreview,
    isTestnetUniswapPlan,
    enableTestnetMode,
    enableLiveExecution,
    isConnected,
    address,
    chainId,
    contractHealth.contractReachable,
    contractHealth.isLoading,
  ])

  useEffect(() => {
    if (!open || !plan || !isTestnetUniswapPlan || !address || !baseAssessment?.readyForSimulation) {
      setSimulation(null)
      setSimulating(false)
      return
    }

    if (baseAssessment.prepareResult?.status !== 'ready') {
      setSimulation(null)
      setSimulating(false)
      return
    }

    let cancelled = false
    setSimulating(true)
    setSimulation(null)

    const prepareResult = baseAssessment.prepareResult
    void simulateBundleExecution(
      {
        basketId: prepareResult.basketId,
        swaps: prepareResult.swapCalls,
        value: prepareResult.totalNativeEthWei,
      },
      address,
    ).then((result) => {
      if (!cancelled) {
        setSimulation(result)
        setSimulating(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, plan, isTestnetUniswapPlan, address, baseAssessment])

  const assessment = useMemo(() => {
    if (!baseAssessment) {
      return {
        isTestnetUniswapPlan: false,
        gates: [],
        prepareResult: null,
        readyForSimulation: false,
        canExecute: false,
        blockedReason: null,
      }
    }
    return finalizeTestnetExecutionAssessment(baseAssessment, simulation, simulating)
  }, [baseAssessment, simulation, simulating])

  useEffect(() => {
    if (!open) {
      resetExecute()
      setSimulation(null)
      setSimulating(false)
    }
  }, [open, resetExecute])

  const canExecute =
    assessment.isTestnetUniswapPlan &&
    assessment.canExecute &&
    executeStatus !== 'pending' &&
    !isWritePending

  const disabledReason = !assessment.isTestnetUniswapPlan
    ? null
    : executeStatus === 'pending' || isWritePending
      ? 'Transaction pending…'
      : assessment.blockedReason

  const reset = useCallback(() => {
    resetExecute()
    setSimulation(null)
    setSimulating(false)
  }, [resetExecute])

  const execute = useCallback(async () => {
    if (!canExecute || !plan || baseAssessment?.prepareResult?.status !== 'ready') return

    const confirmed = window.confirm(TESTNET_UNISWAP_CONFIRMATION_MESSAGE)
    if (!confirmed) return

    const prepareResult = baseAssessment.prepareResult
    await executeBundle({
      basketId: prepareResult.basketId,
      swaps: prepareResult.swapCalls,
      value: prepareResult.totalNativeEthWei,
    })
  }, [canExecute, plan, baseAssessment, executeBundle])

  return {
    isTestnetUniswapPlan: assessment.isTestnetUniswapPlan,
    gates: assessment.gates,
    canExecute,
    disabledReason,
    simulating,
    status: executeStatus,
    txHash,
    explorerUrl,
    errorMessage,
    execute,
    reset,
  }
}

export function getTestnetUniswapExecuteAmountLabel(): string {
  return `${formatEther(TESTNET_DEFAULT_SWAP_AMOUNT_WEI)} Sepolia ETH`
}
