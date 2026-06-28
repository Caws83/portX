import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId, usePublicClient } from 'wagmi'
import { simulateContract } from 'wagmi/actions'
import type { Hex } from 'viem'
import { formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import { wagmiConfig } from '@/config/wagmi'
import { TESTNET_DEFAULT_SWAP_AMOUNT_WEI, TESTNET_SEPOLIA_CHAIN_ID } from '@/config/testnetExecution'
import { TESTNET_MULTI_TOKEN_BASKET } from '@/data/testnetMultiTokenBasket'
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
import { useBundleExecutorFeeConfig } from '@/hooks/useBundleExecutorFeeConfig'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import {
  grossUpEthValueForBuyFee,
} from '@/services/protocolFee'
import {
  useTestnetBundleExecutorApprovals,
  verifyTestnetSellApprovals,
  type UseTestnetBundleExecutorApprovalsResult,
} from '@/hooks/useTestnetBundleExecutorApprovals'
import { useTestnetPortfolioBalances } from '@/hooks/useTestnetPortfolioBalances'
import { refreshTestnetSellExecutionBundle } from '@/services/testnetSellExecution'
import { formatTestnetExecutionError } from '@/utils/bundleExecutorErrors'
import { isSepoliaTestnetTradePlan, type TestnetQuoteSource } from '@/utils/testnetPreview'
import {
  EXECUTION_ROUTER_NAME,
  TESTNET_BUTTONS,
  TESTNET_CONFIRM,
} from '@/config/testnetUxCopy'

export const TESTNET_UNISWAP_BUY_CONFIRMATION_MESSAGE = TESTNET_CONFIRM.buy

export const TESTNET_UNISWAP_SELL_CONFIRMATION_MESSAGE = TESTNET_CONFIRM.sell

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
      message: formatTestnetExecutionError(error),
    }
  }
}

export function useTestnetUniswapBasketExecute(
  plan: ExecutionPlan | null,
  open: boolean,
  quoteSource: TestnetQuoteSource = null,
): UseTestnetUniswapBasketExecuteResult {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient({ chainId: TESTNET_SEPOLIA_CHAIN_ID })
  const { enableLiveExecution, enableTestnetMode } = useFeatureFlags()
  const contractHealth = useBundleExecutorHealth()
  const feeConfigState = useBundleExecutorFeeConfig()
  const testnetBalances = useTestnetPortfolioBalances()
  const approvals = useTestnetBundleExecutorApprovals(plan, open, feeConfigState.config)
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
  const [preExecuteError, setPreExecuteError] = useState<string | null>(null)

  const isTestnetUniswapPlan = useMemo(
    () => (plan ? isSepoliaTestnetTradePlan(plan, quoteSource) : false),
    [plan, quoteSource],
  )

  const isSellPlan = plan?.type === 'sell_basket'

  const resolveBundleMsgValue = useCallback(
    (legEthWei: bigint) => grossUpEthValueForBuyFee(legEthWei, feeConfigState.config),
    [feeConfigState.config],
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
        value: resolveBundleMsgValue(prepareResult.totalNativeEthWei),
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
  }, [open, plan, isTestnetUniswapPlan, address, baseAssessment, resolveBundleMsgValue])

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
      setPreExecuteError(null)
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
      : approvals.missingUsdcFeeApproval
        ? 'Approve USDC protocol fee before selling.'
        : !approvals.allApprovalsSufficient
          ? `Approve each portfolio token for ${EXECUTION_ROUTER_NAME}`
          : assessment.blockedReason

  const reset = useCallback(() => {
    resetExecute()
    setSimulation(null)
    setSimulating(false)
    setPreExecuteError(null)
  }, [resetExecute])

  const execute = useCallback(async () => {
    if (!canExecute || !plan || !address) return

    const confirmationMessage = isSellPlan
      ? TESTNET_UNISWAP_SELL_CONFIRMATION_MESSAGE
      : TESTNET_UNISWAP_BUY_CONFIRMATION_MESSAGE
    const confirmed = window.confirm(confirmationMessage)
    if (!confirmed) return

    let prepareResult = baseAssessment?.prepareResult
    if (prepareResult?.status !== 'ready') return

    setPreExecuteError(null)

    if (isSellPlan) {
      const balancesWei = Object.fromEntries(
        testnetBalances.assets.map((asset) => [asset.symbol, asset.balanceWei]),
      )
      const refreshed = await refreshTestnetSellExecutionBundle({
        plan,
        allocations: TESTNET_MULTI_TOKEN_BASKET.allocations,
        balancesWei,
        walletAddress: address,
      })
      if (!refreshed) {
        setPreExecuteError('Could not refresh sell quote — open sell preview again.')
        return
      }
      prepareResult = refreshed.prepareResult

      if (publicClient) {
        const approvalCheck = await verifyTestnetSellApprovals({
          plan: refreshed.plan,
          feeConfig: feeConfigState.config,
          owner: address,
          publicClient,
        })
        if (!approvalCheck.sufficient) {
          await approvals.refetchAllowances()
          setPreExecuteError(
            approvalCheck.missingUsdcFee
              ? 'Approve USDC protocol fee before selling.'
              : 'Approve each portfolio token before selling.',
          )
          return
        }
      }
    }

    await executeBundle({
      basketId: prepareResult.basketId,
      swaps: prepareResult.swapCalls,
      value: isSellPlan ? 0n : resolveBundleMsgValue(prepareResult.totalNativeEthWei),
    })
  }, [
    canExecute,
    plan,
    address,
    baseAssessment,
    isSellPlan,
    testnetBalances.assets,
    publicClient,
    feeConfigState.config,
    executeBundle,
    resolveBundleMsgValue,
    approvals,
  ])

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
    errorMessage: preExecuteError ?? errorMessage,
    execute,
    reset,
    approvals,
  }
}

export function getTestnetUniswapExecuteAmountLabel(): string {
  return `${formatEther(TESTNET_DEFAULT_SWAP_AMOUNT_WEI)} Sepolia ETH`
}

export function getTestnetUniswapSellExecuteLabel(): string {
  return TESTNET_BUTTONS.executeTestnetSell
}

export function getTestnetUniswapBuyExecuteLabel(): string {
  return TESTNET_BUTTONS.executeTestnetTrade
}
