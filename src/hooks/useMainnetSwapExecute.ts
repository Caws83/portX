import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId, useReadContract, useSendTransaction, useWriteContract } from 'wagmi'
import { getPublicClient, waitForTransactionReceipt } from '@wagmi/core'
import type { ExecutionPlan } from '@/types/execution'
import type { Hex } from 'viem'
import { erc20Abi } from 'viem'
import { mainnet } from 'viem/chains'
import { wagmiConfig } from '@/config/wagmi'
import { getExplorerTxUrl } from '@/config/networks'
import { ENABLE_MAINNET_EXECUTION } from '@/config/features'
import {
  assessMainnetPilotEligibility,
  type MainnetPilotQuoteSource,
} from '@/utils/mainnetPilotReadiness'

const NATIVE_ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

export type MainnetSwapExecuteStatus = 'idle' | 'approving' | 'pending' | 'success' | 'error'

export interface UseMainnetSwapExecuteResult {
  isEligible: boolean
  showPilotUi: boolean
  disabledReason: string | null
  checks: ReturnType<typeof assessMainnetPilotEligibility>['checks']
  requiresApproval: boolean
  approvalRequired: boolean
  allowanceSufficient: boolean
  spenderDisplay: string | null
  tokenSymbol: string | null
  status: MainnetSwapExecuteStatus
  txHash?: Hex
  approvalTxHash?: Hex
  explorerUrl?: string
  approvalExplorerUrl?: string
  errorMessage?: string
  simulationPassed: boolean | null
  simulationMessage: string | null
  isBusy: boolean
  canExecuteSwap: boolean
  approve: () => Promise<void>
  execute: () => Promise<void>
  reset: () => void
}

function isValidErc20Address(address: string | null | undefined): address is Hex {
  return Boolean(address && /^0x[0-9a-fA-F]{40}$/.test(address))
}

function resolveTokenAddress(plan: ExecutionPlan): Hex | null {
  const quote = plan.legs[0]?.quote
  const execution = quote?.execution
  if (!execution?.requiresApproval) return null

  const candidate = execution.tokenIn ?? quote.inputToken.address
  if (!isValidErc20Address(candidate)) return null
  if (candidate.toLowerCase() === NATIVE_ETH_ADDRESS) return null
  if (candidate === '0x0000000000000000000000000000000000000000') return null
  return candidate
}

export function useMainnetSwapExecute(
  plan: ExecutionPlan | null,
  open: boolean,
  quoteSource: MainnetPilotQuoteSource
): UseMainnetSwapExecuteResult {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { writeContractAsync, isPending: isApprovePending } = useWriteContract()
  const { sendTransactionAsync, isPending: isSendPending } = useSendTransaction()

  const [status, setStatus] = useState<MainnetSwapExecuteStatus>('idle')
  const [txHash, setTxHash] = useState<Hex | undefined>()
  const [approvalTxHash, setApprovalTxHash] = useState<Hex | undefined>()
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [simulationPassed, setSimulationPassed] = useState<boolean | null>(null)
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null)

  const walletConnected = isConnected && Boolean(address)
  const mainnetChainId = mainnet.id

  const assessment = useMemo(
    () =>
      assessMainnetPilotEligibility(plan, {
        quoteSource,
        walletConnected,
        currentChainId: chainId,
        flagEnabled: ENABLE_MAINNET_EXECUTION,
      }),
    [plan, quoteSource, walletConnected, chainId]
  )

  const execution = plan?.legs[0]?.quote.execution
  const sellAmount = execution?.sellAmount ? BigInt(execution.sellAmount) : 0n
  const spender = execution?.spender as Hex | undefined
  const tokenAddress = plan ? resolveTokenAddress(plan) : null
  const requiresApproval = Boolean(execution?.requiresApproval && tokenAddress && spender)
  const tokenSymbol = plan?.legs[0]?.quote.inputToken.symbol ?? null

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress ?? undefined,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && spender ? [address, spender] : undefined,
    chainId: mainnetChainId,
    query: {
      enabled: open && assessment.eligible && requiresApproval && Boolean(address && spender && tokenAddress),
    },
  })

  const allowance = typeof allowanceRaw === 'bigint' ? allowanceRaw : 0n
  const allowanceSufficient = !requiresApproval || (sellAmount > 0n && allowance >= sellAmount)
  const approvalRequired = requiresApproval && !allowanceSufficient

  useEffect(() => {
    if (!open) {
      setStatus('idle')
      setTxHash(undefined)
      setApprovalTxHash(undefined)
      setErrorMessage(undefined)
      setSimulationPassed(null)
      setSimulationMessage(null)
    }
  }, [open, plan?.id])

  const reset = useCallback(() => {
    setStatus('idle')
    setTxHash(undefined)
    setApprovalTxHash(undefined)
    setErrorMessage(undefined)
    setSimulationPassed(null)
    setSimulationMessage(null)
  }, [])

  const simulateSwap = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!plan || !address || !execution?.transactionTo || !execution.transactionData) {
      const message = 'Missing transaction payload'
      setSimulationPassed(false)
      setSimulationMessage(message)
      return { ok: false, message }
    }

    try {
      const client = getPublicClient(wagmiConfig, { chainId: mainnetChainId })
      if (!client) throw new Error('Mainnet RPC unavailable')

      await client.call({
        account: address,
        to: execution.transactionTo as Hex,
        data: execution.transactionData as Hex,
        value: BigInt(execution.transactionValue ?? '0'),
      })

      setSimulationPassed(true)
      setSimulationMessage('Simulation passed')
      return { ok: true, message: 'Simulation passed' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Simulation failed'
      setSimulationPassed(false)
      setSimulationMessage(message)
      return { ok: false, message }
    }
  }, [plan, address, execution, mainnetChainId])

  const approve = useCallback(async () => {
    if (!tokenAddress || !spender || sellAmount <= 0n) {
      setErrorMessage('Approval parameters unavailable')
      setStatus('error')
      return
    }

    setStatus('approving')
    setErrorMessage(undefined)

    try {
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, sellAmount],
        chainId: mainnetChainId,
      })

      setApprovalTxHash(hash)
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
      if (receipt.status === 'reverted') {
        setStatus('error')
        setErrorMessage('Approval transaction reverted')
        return
      }

      await refetchAllowance()
      setStatus('idle')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Approval failed')
    }
  }, [tokenAddress, spender, sellAmount, writeContractAsync, mainnetChainId, refetchAllowance])

  const execute = useCallback(async () => {
    if (!plan || !assessment.eligible || !execution?.transactionTo || !execution.transactionData) {
      setStatus('error')
      setErrorMessage(assessment.disabledReason ?? 'Not eligible for mainnet pilot')
      return
    }

    if (approvalRequired) {
      setStatus('error')
      setErrorMessage('Approval required before swap')
      return
    }

    setStatus('pending')
    setErrorMessage(undefined)
    setTxHash(undefined)

    try {
      const sim = await simulateSwap()
      if (!sim.ok) {
        setStatus('error')
        setErrorMessage(sim.message)
        return
      }

      const hash = await sendTransactionAsync({
        to: execution.transactionTo as Hex,
        data: execution.transactionData as Hex,
        value: BigInt(execution.transactionValue ?? '0'),
        chainId: mainnetChainId,
      })

      setTxHash(hash)

      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
      if (receipt.status === 'reverted') {
        setStatus('error')
        setErrorMessage('Swap transaction reverted on-chain')
        return
      }

      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Swap failed')
    }
  }, [
    plan,
    assessment.eligible,
    assessment.disabledReason,
    execution,
    approvalRequired,
    simulateSwap,
    sendTransactionAsync,
    mainnetChainId,
  ])

  const isBusy = status === 'pending' || status === 'approving' || isApprovePending || isSendPending
  const canExecuteSwap = assessment.eligible && allowanceSufficient && !isBusy && status !== 'success'
  const showPilotUi = assessment.eligible && plan?.type === 'buy'

  const spenderDisplay = execution?.spender
    ? `${execution.spender.slice(0, 8)}…${execution.spender.slice(-4)}`
    : null

  return {
    isEligible: assessment.eligible,
    showPilotUi,
    disabledReason: assessment.disabledReason,
    checks: assessment.checks,
    requiresApproval,
    approvalRequired,
    allowanceSufficient,
    spenderDisplay,
    tokenSymbol,
    status: isBusy && status === 'idle' ? 'pending' : status,
    txHash,
    approvalTxHash,
    explorerUrl: txHash ? getExplorerTxUrl(mainnetChainId, txHash) : undefined,
    approvalExplorerUrl: approvalTxHash
      ? getExplorerTxUrl(mainnetChainId, approvalTxHash)
      : undefined,
    errorMessage,
    simulationPassed,
    simulationMessage,
    isBusy,
    canExecuteSwap,
    approve,
    execute,
    reset,
  }
}
