import { useCallback, useMemo } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { keccak256, parseEther, toBytes, zeroAddress, type Hex } from 'viem'
import { BUNDLE_EXECUTOR_SEPOLIA, MOCK_ROUTER_SEPOLIA } from '@/config/contracts'
import { ENABLE_LIVE_EXECUTION, ENABLE_TESTNET_MODE } from '@/config/features'
import { useBundleExecutorExecute } from '@/hooks/useBundleExecutorExecute'
import { useBundleExecutorHealth } from '@/hooks/useBundleExecutorHealth'
import { getBundleExecutorChainId } from '@/services/bundleExecutorContract'

export const MOCK_ETH_TEST_BASKET_ID = keccak256(toBytes('MOCK_ETH_TEST_UI'))
export const MOCK_ETH_TEST_AMOUNT = parseEther('0.00001')

const SEPOLIA_CHAIN_ID = getBundleExecutorChainId()

export type MockExecuteBasketStatus = 'idle' | 'pending' | 'success' | 'error'

export interface MockExecuteBasketGate {
  id: string
  label: string
  passed: boolean
  detail?: string
}

export interface UseMockExecuteBasketResult {
  isSectionVisible: boolean
  gates: MockExecuteBasketGate[]
  canExecute: boolean
  disabledReason: string | null
  status: MockExecuteBasketStatus
  txHash?: Hex
  explorerUrl?: string
  errorMessage?: string
  execute: () => Promise<void>
  reset: () => void
}

const CONFIRMATION_MESSAGE =
  'Sepolia testnet only: send 0.00001 ETH via BundleExecutor.executeBasket to MockRouter. ' +
  'This is a real on-chain transaction using test ETH. Continue?'

function buildMockEthSwapCall() {
  return {
    router: MOCK_ROUTER_SEPOLIA.address,
    data: '0x' as Hex,
    tokenIn: zeroAddress,
    amountIn: MOCK_ETH_TEST_AMOUNT,
    minAmountOut: 0n,
    tokenOut: zeroAddress,
  } as const
}

export function useMockExecuteBasket(): UseMockExecuteBasketResult {
  const { isConnected } = useAccount()
  const chainId = useChainId()
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

  const isSectionVisible = ENABLE_TESTNET_MODE && ENABLE_LIVE_EXECUTION

  const gates = useMemo<MockExecuteBasketGate[]>(() => {
    const testnetMode = ENABLE_TESTNET_MODE
    const liveExecution = ENABLE_LIVE_EXECUTION
    const walletConnected = isConnected
    const correctNetwork = chainId === SEPOLIA_CHAIN_ID
    const contractReachable = contractHealth.contractReachable === true

    return [
      {
        id: 'testnet-mode',
        label: 'VITE_APP_MODE=testnet',
        passed: testnetMode,
        detail: testnetMode ? 'Testnet mode active' : 'Set VITE_APP_MODE=testnet',
      },
      {
        id: 'live-execution',
        label: 'VITE_ENABLE_LIVE_EXECUTION=true',
        passed: liveExecution,
        detail: liveExecution ? 'Live execution enabled' : 'Set VITE_ENABLE_LIVE_EXECUTION=true',
      },
      {
        id: 'wallet-connected',
        label: 'Wallet connected',
        passed: walletConnected,
        detail: walletConnected ? 'Connected' : 'Connect wallet',
      },
      {
        id: 'sepolia-chain',
        label: 'Wallet on Sepolia (11155111)',
        passed: correctNetwork,
        detail: correctNetwork
          ? 'Sepolia'
          : chainId
            ? `Chain ${chainId} — switch to Sepolia`
            : 'Switch wallet to Sepolia',
      },
      {
        id: 'contract-reachable',
        label: 'BundleExecutor reachable',
        passed: contractReachable,
        detail: contractHealth.isLoading
          ? 'Checking…'
          : contractReachable
            ? BUNDLE_EXECUTOR_SEPOLIA.address
            : 'Contract not reachable on Sepolia',
      },
    ]
  }, [chainId, contractHealth.contractReachable, contractHealth.isLoading, isConnected])

  const failedGate = gates.find((gate) => !gate.passed)
  const canExecute =
    isSectionVisible && !failedGate && executeStatus !== 'pending' && !isWritePending
  const disabledReason = !isSectionVisible
    ? 'Hidden — requires testnet mode and live execution flag'
    : failedGate
      ? failedGate.detail ?? failedGate.label
      : executeStatus === 'pending' || isWritePending
        ? 'Transaction pending…'
        : null

  const reset = useCallback(() => {
    resetExecute()
  }, [resetExecute])

  const execute = useCallback(async () => {
    if (!canExecute) return

    const confirmed = window.confirm(CONFIRMATION_MESSAGE)
    if (!confirmed) return

    await executeBundle({
      basketId: MOCK_ETH_TEST_BASKET_ID,
      swaps: [buildMockEthSwapCall()],
      value: MOCK_ETH_TEST_AMOUNT,
    })
  }, [canExecute, executeBundle])

  return {
    isSectionVisible,
    gates,
    canExecute,
    disabledReason,
    status: executeStatus,
    txHash,
    explorerUrl,
    errorMessage,
    execute,
    reset,
  }
}
