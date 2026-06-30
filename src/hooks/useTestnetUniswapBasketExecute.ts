import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useChainId, usePublicClient } from 'wagmi'
import { simulateContract } from 'wagmi/actions'
import type { Hex } from 'viem'
import { formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import { wagmiConfig } from '@/config/wagmi'
import {
  TESTNET_DEFAULT_SWAP_AMOUNT_WEI,
  TESTNET_SEPOLIA_CHAIN_ID,
} from '@/config/testnetExecution'
import type { ExecutionPlan } from '@/types/execution'
import { sumTestnetPlanInputWei } from '@/utils/testnetPreview'
import { TESTNET_MULTI_TOKEN_BASKET } from '@/data/testnetMultiTokenBasket'
import {
  BUNDLE_EXECUTOR_EXECUTE_ABI,
  getBundleExecutorAddress,
  type ExecuteBundleParams,
} from '@/services/bundleExecutorContract'
import {
  assessTestnetUniswapBasketExecution,
  finalizeTestnetExecutionAssessment,
} from '@/services/testnetExecutionSafety'
import {
  executionPlanToQuotePreview,
  type BundleExecutionPrepareResult,
} from '@/services/bundleExecutorWrite'
import { useBundleExecutorExecute } from '@/hooks/useBundleExecutorExecute'
import { useBundleExecutorHealth } from '@/hooks/useBundleExecutorHealth'
import { useBundleExecutorFeeConfig } from '@/hooks/useBundleExecutorFeeConfig'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { grossUpEthValueForBuyFee } from '@/services/protocolFee'
import {
  useTestnetBundleExecutorApprovals,
  verifyTestnetSellApprovals,
  type UseTestnetBundleExecutorApprovalsResult,
} from '@/hooks/useTestnetBundleExecutorApprovals'
import { useTestnetPortfolioBalances } from '@/hooks/useTestnetPortfolioBalances'
import { refreshTestnetSellExecutionBundle } from '@/services/testnetSellExecution'
import { formatTestnetSimulationError, type TestnetTradeDirection } from '@/utils/bundleExecutorErrors'
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

const SIMULATION_TIMEOUT_MS = 30_000

type SellPayloadReady = {
  plan: ExecutionPlan
  prepareResult: Extract<BundleExecutionPrepareResult, { status: 'ready' }>
}

export interface UseTestnetUniswapBasketExecuteResult {
  isTestnetUniswapPlan: boolean
  isSellPlan: boolean
  gates: ReturnType<typeof finalizeTestnetExecutionAssessment>['gates']
  canExecute: boolean
  disabledReason: string | null
  simulating: boolean
  sellPayloadRefreshing: boolean
  status: TestnetUniswapBasketExecuteStatus
  txHash?: Hex
  explorerUrl?: string
  errorMessage?: string
  execute: () => Promise<void>
  refreshSellQuote: () => void
  reset: () => void
  approvals: UseTestnetBundleExecutorApprovalsResult
}

async function simulateBundleExecution(
  params: ExecuteBundleParams,
  account: `0x${string}`,
  direction: TestnetTradeDirection,
): Promise<{ passed: boolean; message: string }> {
  const simulationPromise = simulateContract(wagmiConfig, {
    address: getBundleExecutorAddress(),
    abi: BUNDLE_EXECUTOR_EXECUTE_ABI,
    functionName: 'executeBasket',
    args: [params.basketId, params.swaps],
    value: params.value,
    account,
    chainId: sepolia.id,
  })
    .then(() => ({ passed: true as const, message: 'Static simulation succeeded' }))
    .catch((error) => ({
      passed: false as const,
      message: formatTestnetSimulationError(error, direction),
    }))

  const timeoutPromise = new Promise<{ passed: false; message: string }>((resolve) => {
    setTimeout(
      () =>
        resolve({
          passed: false,
          message: 'Simulation timed out. Refresh quote and try again.',
        }),
      SIMULATION_TIMEOUT_MS,
    )
  })

  return Promise.race([simulationPromise, timeoutPromise])
}

function sellPayloadSimulationKey(payload: SellPayloadReady | null): string | null {
  if (!payload) return null
  const { prepareResult } = payload
  return `${prepareResult.basketId}:${prepareResult.swapCalls.length}:${prepareResult.totalNativeEthWei.toString()}`
}

function buildExecuteParams(
  prepareResult: Extract<BundleExecutionPrepareResult, { status: 'ready' }>,
  isSellPlan: boolean,
  resolveBundleMsgValue: (legEthWei: bigint) => bigint,
): ExecuteBundleParams {
  return {
    basketId: prepareResult.basketId,
    swaps: prepareResult.swapCalls,
    value: isSellPlan ? 0n : resolveBundleMsgValue(prepareResult.totalNativeEthWei),
  }
}

export interface UseTestnetUniswapBasketExecuteOptions {
  preferMaxApproval?: boolean
}

export function useTestnetUniswapBasketExecute(
  plan: ExecutionPlan | null,
  open: boolean,
  quoteSource: TestnetQuoteSource = null,
  options: UseTestnetUniswapBasketExecuteOptions = {},
): UseTestnetUniswapBasketExecuteResult {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient({ chainId: TESTNET_SEPOLIA_CHAIN_ID })
  const { enableLiveExecution, enableTestnetMode } = useFeatureFlags()
  const contractHealth = useBundleExecutorHealth()
  const feeConfigState = useBundleExecutorFeeConfig()
  const testnetBalances = useTestnetPortfolioBalances()
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
  const [sellPayload, setSellPayload] = useState<SellPayloadReady | null>(null)
  const [sellPayloadLoading, setSellPayloadLoading] = useState(false)
  const [sellRefreshGeneration, setSellRefreshGeneration] = useState(0)

  const planRef = useRef(plan)
  planRef.current = plan
  const sellPayloadRef = useRef(sellPayload)
  sellPayloadRef.current = sellPayload
  const balancesWeiRef = useRef(testnetBalances.balancesWei)
  balancesWeiRef.current = testnetBalances.balancesWei

  const isTestnetUniswapPlan = useMemo(
    () => (plan ? isSepoliaTestnetTradePlan(plan, quoteSource) : false),
    [plan, quoteSource],
  )

  const isSellPlan = plan?.type === 'sell_basket'

  const resolveBundleMsgValue = useCallback(
    (legEthWei: bigint) => grossUpEthValueForBuyFee(legEthWei, feeConfigState.config),
    [feeConfigState.config],
  )

  const refreshSellPayload = useCallback(async (): Promise<SellPayloadReady | null> => {
    const currentPlan = planRef.current
    if (!currentPlan || !address || currentPlan.type !== 'sell_basket') {
      return sellPayloadRef.current
    }

    setSellPayloadLoading(true)
    try {
      const refreshed = await refreshTestnetSellExecutionBundle({
        plan: currentPlan,
        allocations: TESTNET_MULTI_TOKEN_BASKET.allocations,
        balancesWei: balancesWeiRef.current,
        walletAddress: address,
      })
      if (refreshed) {
        setSellPayload(refreshed)
        return refreshed
      }
      return sellPayloadRef.current
    } catch {
      return sellPayloadRef.current
    } finally {
      setSellPayloadLoading(false)
    }
  }, [address])

  const requestSellPayloadRefresh = useCallback(() => {
    setSimulation(null)
    setPreExecuteError(null)
    setSellRefreshGeneration((generation) => generation + 1)
  }, [])

  const handleApprovalSuccess = useCallback(() => {
    if (!isSellPlan) return
    requestSellPayloadRefresh()
  }, [isSellPlan, requestSellPayloadRefresh])

  const effectivePlan = isSellPlan ? (sellPayload?.plan ?? plan) : plan
  const approvalsOpen = open

  const approvals = useTestnetBundleExecutorApprovals(
    effectivePlan,
    approvalsOpen,
    feeConfigState.config,
    {
      onApprovalSuccess: handleApprovalSuccess,
      preferMaxApproval: options.preferMaxApproval,
    },
  )

  const bundleQuotePreview = useMemo(() => {
    if (!effectivePlan || !open || effectivePlan.isDemo) return null
    return executionPlanToQuotePreview(effectivePlan)
  }, [effectivePlan, open])

  const baseAssessment = useMemo(() => {
    if (!effectivePlan || !open || !bundleQuotePreview || !isTestnetUniswapPlan) return null
    return assessTestnetUniswapBasketExecution(effectivePlan, bundleQuotePreview, {
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
    effectivePlan,
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
    if (!open || !isSellPlan || !isTestnetUniswapPlan || !address || !plan) {
      if (!open) {
        setSellPayload(null)
        setSellPayloadLoading(false)
      }
      return
    }

    let cancelled = false
    setSellPayloadLoading(true)

    void refreshTestnetSellExecutionBundle({
      plan: planRef.current!,
      allocations: TESTNET_MULTI_TOKEN_BASKET.allocations,
      balancesWei: balancesWeiRef.current,
      walletAddress: address,
    })
      .then((refreshed) => {
        if (!cancelled && refreshed) {
          setSellPayload(refreshed)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSellPayloadLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    open,
    isSellPlan,
    isTestnetUniswapPlan,
    address,
    plan?.id,
    plan?.slippageBps,
    sellRefreshGeneration,
  ])

  const sellPayloadSimKey = sellPayloadSimulationKey(sellPayload)

  useEffect(() => {
    if (!open || !plan || !isTestnetUniswapPlan || !address) {
      setSimulation(null)
      setSimulating(false)
      return
    }

    if (isSellPlan) {
      if (sellPayloadLoading) {
        setSimulating(false)
        return
      }
      if (!sellPayload?.prepareResult) {
        setSimulation(null)
        setSimulating(false)
        return
      }
      if (!approvals.allApprovalsSufficient) {
        setSimulation(null)
        setSimulating(false)
        return
      }
    }

    if (!baseAssessment?.readyForSimulation) {
      setSimulation(null)
      setSimulating(false)
      return
    }

    const prepareResult = isSellPlan
      ? sellPayload?.prepareResult
      : baseAssessment.prepareResult

    if (!prepareResult || prepareResult.status !== 'ready') {
      setSimulation(null)
      setSimulating(false)
      return
    }

    let cancelled = false
    setSimulating(true)
    setSimulation(null)

    const executeParams = buildExecuteParams(
      prepareResult,
      isSellPlan,
      resolveBundleMsgValue,
    )
    const tradeDirection: TestnetTradeDirection = isSellPlan ? 'sell' : 'buy'

    void simulateBundleExecution(executeParams, address, tradeDirection).then((result) => {
      if (!cancelled) {
        setSimulation(result)
        setSimulating(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    open,
    plan?.id,
    isTestnetUniswapPlan,
    address,
    isSellPlan,
    sellPayloadSimKey,
    sellPayloadLoading,
    baseAssessment?.readyForSimulation,
    baseAssessment?.prepareResult?.status,
    approvals.allApprovalsSufficient,
    resolveBundleMsgValue,
  ])

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
      setSellPayload(null)
      setSellPayloadLoading(false)
    }
  }, [open, resetExecute])

  const sellExecuteReady =
    !isSellPlan ||
    (sellPayload !== null &&
      sellPayload.prepareResult.status === 'ready' &&
      simulation?.passed === true &&
      !sellPayloadLoading &&
      !simulating)

  const canExecute =
    assessment.isTestnetUniswapPlan &&
    executeStatus !== 'pending' &&
    !isWritePending &&
    approvals.allApprovalsSufficient &&
    (isSellPlan ? sellExecuteReady : assessment.canExecute)

  const disabledReason = !assessment.isTestnetUniswapPlan
    ? null
    : executeStatus === 'pending' || isWritePending
      ? 'Transaction pending…'
      : isSellPlan && sellPayloadLoading
        ? 'Refreshing sell quote…'
        : isSellPlan && !sellPayload && !sellPayloadLoading
          ? 'Sell quote unavailable — refresh quote and try again.'
          : isSellPlan && sellPayload && simulation?.passed !== true
            ? simulating
              ? 'Simulating sell transaction…'
              : simulation?.message ?? 'Simulation required before execute.'
            : !isSellPlan && simulation?.passed !== true
              ? simulating
                ? 'Simulating buy transaction…'
                : simulation?.message ?? 'Simulation required before execute.'
              : isSellPlan && approvals.missingUsdcFeeApproval
                ? 'Approve USDC protocol fee before selling.'
                : isSellPlan && !approvals.allApprovalsSufficient
                  ? approvals.missingInputApprovals.some((leg) => leg.needsAdditionalApproval) ||
                      approvals.protocolFeeLeg?.needsAdditionalApproval
                    ? 'Quote updated — approve the new amount required for this sell.'
                    : `Approve each portfolio token for ${EXECUTION_ROUTER_NAME}`
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

    setPreExecuteError(null)

    let prepareResult =
      isSellPlan && sellPayload?.prepareResult
        ? sellPayload.prepareResult
        : baseAssessment?.prepareResult

    if (prepareResult?.status !== 'ready') return

    if (isSellPlan) {
      const refreshed = await refreshSellPayload()
      if (!refreshed) {
        setPreExecuteError('Sell simulation failed — refresh quote and try again.')
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

      const executeParams = buildExecuteParams(prepareResult, true, resolveBundleMsgValue)
      const simResult = await simulateBundleExecution(executeParams, address, 'sell')
      setSimulation(simResult)
      if (!simResult.passed) {
        setPreExecuteError(simResult.message)
        return
      }

      await executeBundle(executeParams, { direction: 'sell' })
      return
    }

    const buyExecuteParams = buildExecuteParams(prepareResult, false, resolveBundleMsgValue)
    const buySimResult = await simulateBundleExecution(buyExecuteParams, address, 'buy')
    setSimulation(buySimResult)
    if (!buySimResult.passed) {
      setPreExecuteError(buySimResult.message)
      return
    }

    await executeBundle(buyExecuteParams, { direction: 'buy' })
  }, [
    canExecute,
    plan,
    address,
    isSellPlan,
    sellPayload,
    baseAssessment,
    refreshSellPayload,
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
    sellPayloadRefreshing: isSellPlan && sellPayloadLoading,
    status: executeStatus,
    txHash,
    explorerUrl,
    errorMessage: preExecuteError ?? errorMessage,
    execute,
    refreshSellQuote: requestSellPayloadRefresh,
    reset,
    approvals,
  }
}

export function getTestnetUniswapExecuteAmountLabel(plan?: ExecutionPlan | null): string {
  if (plan?.type === 'buy') {
    return `${formatEther(sumTestnetPlanInputWei(plan))} Sepolia ETH`
  }
  return `${formatEther(TESTNET_DEFAULT_SWAP_AMOUNT_WEI)} Sepolia ETH`
}

export function getTestnetUniswapSellExecuteLabel(): string {
  return TESTNET_BUTTONS.executeTestnetSell
}

export function getTestnetUniswapBuyExecuteLabel(): string {
  return TESTNET_BUTTONS.executeTestnetTrade
}
