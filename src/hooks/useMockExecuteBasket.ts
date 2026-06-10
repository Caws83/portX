import { useCallback, useMemo, useState } from 'react'
import { useAccount, useChainId, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { keccak256, parseEther, toBytes, zeroAddress, type Hex } from 'viem'
import { BUNDLE_EXECUTOR_SEPOLIA, MOCK_ROUTER_SEPOLIA } from '@/config/contracts'
import { ENABLE_LIVE_EXECUTION, ENABLE_TESTNET_MODE } from '@/config/features'
import { getExplorerTxUrl } from '@/config/networks'
import { wagmiConfig } from '@/config/wagmi'
import { useBundleExecutorHealth } from '@/hooks/useBundleExecutorHealth'
import { getBundleExecutorChainId } from '@/services/bundleExecutorContract'

export const MOCK_ETH_TEST_BASKET_ID = keccak256(toBytes('MOCK_ETH_TEST_UI'))
export const MOCK_ETH_TEST_AMOUNT = parseEther('0.00001')

const SEPOLIA_CHAIN_ID = getBundleExecutorChainId()

const BUNDLE_EXECUTOR_EXECUTE_ABI = [
  {
    type: 'function',
    name: 'executeBasket',
    stateMutability: 'payable',
    inputs: [
      { name: 'basketId', type: 'bytes32' },
      {
        name: 'swaps',
        type: 'tuple[]',
        components: [
          { name: 'router', type: 'address' },
          { name: 'data', type: 'bytes' },
          { name: 'tokenIn', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'minAmountOut', type: 'uint256' },
          { name: 'tokenOut', type: 'address' },
        ],
      },
    ],
    outputs: [],
  },
] as const

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
  const { writeContractAsync, isPending: isWritePending } = useWriteContract()

  const [status, setStatus] = useState<MockExecuteBasketStatus>('idle')
  const [txHash, setTxHash] = useState<Hex | undefined>()
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

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
  const canExecute = isSectionVisible && !failedGate && status !== 'pending' && !isWritePending
  const disabledReason = !isSectionVisible
    ? 'Hidden — requires testnet mode and live execution flag'
    : failedGate
      ? failedGate.detail ?? failedGate.label
      : status === 'pending' || isWritePending
        ? 'Transaction pending…'
        : null

  const explorerUrl = txHash ? getExplorerTxUrl(SEPOLIA_CHAIN_ID, txHash) : undefined

  const reset = useCallback(() => {
    setStatus('idle')
    setTxHash(undefined)
    setErrorMessage(undefined)
  }, [])

  const execute = useCallback(async () => {
    if (!canExecute) return

    const confirmed = window.confirm(CONFIRMATION_MESSAGE)
    if (!confirmed) return

    setStatus('pending')
    setTxHash(undefined)
    setErrorMessage(undefined)

    try {
      const hash = await writeContractAsync({
        address: BUNDLE_EXECUTOR_SEPOLIA.address,
        abi: BUNDLE_EXECUTOR_EXECUTE_ABI,
        functionName: 'executeBasket',
        args: [MOCK_ETH_TEST_BASKET_ID, [buildMockEthSwapCall()]],
        value: MOCK_ETH_TEST_AMOUNT,
        chainId: SEPOLIA_CHAIN_ID,
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
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed')
    }
  }, [canExecute, writeContractAsync])

  return {
    isSectionVisible,
    gates,
    canExecute,
    disabledReason,
    status: status === 'pending' || isWritePending ? 'pending' : status,
    txHash,
    explorerUrl,
    errorMessage,
    execute,
    reset,
  }
}
