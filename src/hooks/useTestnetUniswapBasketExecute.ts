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
import {
  useTestnetBundleExecutorApprovals,
  type UseTestnetBundleExecutorApprovalsResult,
} from '@/hooks/useTestnetBundleExecutorApprovals'
import { isTestnetSepoliaUniswapPlan } from '@/utils/testnetPreview'

export const TESTNET_UNISWAP_BUY_CONFIRMATION_MESSAGE =
  'Testnet only: sends Sepolia ETH through BundleExecutor via Uniswap V3 + WETH wrap testnet basket. ' +
  'This is a real on-chain transaction using test ETH. Continue?'

export const TESTNET_UNISWAP_SELL_CONFIRMATION_MESSAGE =
  'Testnet only: sells your Sepolia basket tokens (LINK/UNI/WETH/AAVE) to USDC through BundleExecutor. ' +
  'This is a real on-chain transaction. msg.value = 0. Continue?'

/** @deprecated use TESTNET_UNISWAP_BUY_CONFIRMATION_MESSAGE */
export const TESTNET_UNISWAP_CONFIRMATION_MESSAGE = TESTNET_UNISWAP_BUY_CONFIRMATION_MESSAGE

export type TestnetUniswapBasketExecuteStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UseTestnetUniswapBasketExecuteResult {
  isTestnetUniswapPlan: boolean
  isSellPlan: boolean
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
  approvals: UseTestnetBundleExecutorApprovalsResult
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
  const approvals = useTestnetBundleExecutorApprovals(plan, open)
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

  const isSellPlan = plan?.type === 'sell_basket'

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
      sellApprovalsSufficient: approvals.allApprovalsSufficient,
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
    approvals.allApprovalsSufficient,
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
    !isWritePending &&
    approvals.allApprovalsSufficient

  const disabledReason = !assessment.isTestnetUniswapPlan
    ? null
    : executeStatus === 'pending' || isWritePending
      ? 'Transaction pending…'
      : !approvals.allApprovalsSufficient
        ? 'Approve each basket token for BundleExecutor'
        : assessment.blockedReason

  const reset = useCallback(() => {
    resetExecute()
    setSimulation(null)
    setSimulating(false)
  }, [resetExecute])

  const execute = useCallback(async () => {
    if (!canExecute || !plan || baseAssessment?.prepareResult?.status !== 'ready') return

    const confirmationMessage = isSellPlan
      ? TESTNET_UNISWAP_SELL_CONFIRMATION_MESSAGE
      : TESTNET_UNISWAP_BUY_CONFIRMATION_MESSAGE
    const confirmed = window.confirm(confirmationMessage)
    if (!confirmed) return

    const prepareResult = baseAssessment.prepareResult
    await executeBundle({
      basketId: prepareResult.basketId,
      swaps: prepareResult.swapCalls,
      value: prepareResult.totalNativeEthWei,
    })
  }, [canExecute, plan, baseAssessment, executeBundle, isSellPlan])

  return {
    isTestnetUniswapPlan: assessment.isTestnetUniswapPlan,
    isSellPlan,
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
    approvals,
  }
}

export function getTestnetUniswapExecuteAmountLabel(): string {
  return `${formatEther(TESTNET_DEFAULT_SWAP_AMOUNT_WEI)} Sepolia ETH`
}

export function getTestnetUniswapSellExecuteLabel(): string {
  return 'Execute Sepolia Basket Sell'
}

export function getTestnetUniswapBuyExecuteLabel(): string {
  return 'Execute Sepolia Test Swap'
}
