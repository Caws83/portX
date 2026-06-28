import { createPublicClient, http, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import { BUNDLE_EXECUTOR_SEPOLIA } from '@/config/contracts'

/** Minimal ABI for read-only BundleExecutor status checks */
export const BUNDLE_EXECUTOR_ABI = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'getFeeConfig',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'feeRecipient', type: 'address' },
          { name: 'buyFeeBps', type: 'uint16' },
          { name: 'sellFeeBps', type: 'uint16' },
          { name: 'maxFeeBps', type: 'uint16' },
          { name: 'feesEnabled', type: 'bool' },
        ],
      },
    ],
  },
] as const

export interface BundleExecutorFeeConfig {
  feeRecipient: Address
  buyFeeBps: number
  sellFeeBps: number
  maxFeeBps: number
  feesEnabled: boolean
}

/** Custom errors from BundleExecutor.sol — for revert decoding in the UI */
export const BUNDLE_EXECUTOR_ERROR_ABI = [
  { type: 'error', name: 'NotOwner', inputs: [] },
  {
    type: 'error',
    name: 'FeeExceedsMax',
    inputs: [
      { name: 'requested', type: 'uint16' },
      { name: 'max', type: 'uint16' },
    ],
  },
  { type: 'error', name: 'InvalidFeeRecipient', inputs: [] },
  { type: 'error', name: 'ReentrancyGuardActive', inputs: [] },
  { type: 'error', name: 'EmptyBasket', inputs: [] },
  { type: 'error', name: 'RouterCallFailed', inputs: [{ name: 'legIndex', type: 'uint256' }] },
  { type: 'error', name: 'EthTransferFailed', inputs: [] },
  { type: 'error', name: 'InvalidRecipient', inputs: [] },
  { type: 'error', name: 'SlippageExceeded', inputs: [] },
  { type: 'error', name: 'RouterNotAllowed', inputs: [{ name: 'router', type: 'address' }] },
] as const

/** Matches BundleExecutor.SwapCall — used for executeBasket writes */
export interface BundleExecutorSwapCall {
  router: `0x${string}`
  data: `0x${string}`
  tokenIn: `0x${string}`
  amountIn: bigint
  minAmountOut: bigint
  tokenOut: `0x${string}`
}

export interface ExecuteBundleParams {
  basketId: `0x${string}`
  swaps: BundleExecutorSwapCall[]
  value: bigint
}

/** ABI for BundleExecutor.executeBasket (Sepolia testnet writes only) */
export const BUNDLE_EXECUTOR_EXECUTE_ABI = [
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

const sepoliaPublicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
})

export function getBundleExecutorAddress(): Address {
  return BUNDLE_EXECUTOR_SEPOLIA.address
}

export function getBundleExecutorChainId(): number {
  return BUNDLE_EXECUTOR_SEPOLIA.chainId
}

export async function readBundleExecutorOwner(): Promise<Address> {
  return sepoliaPublicClient.readContract({
    address: BUNDLE_EXECUTOR_SEPOLIA.address,
    abi: BUNDLE_EXECUTOR_ABI,
    functionName: 'owner',
  })
}

export async function readSepoliaChainId(): Promise<number> {
  return sepoliaPublicClient.getChainId()
}

export async function readBundleExecutorFeeConfig(): Promise<BundleExecutorFeeConfig | null> {
  try {
    const config = await sepoliaPublicClient.readContract({
      address: BUNDLE_EXECUTOR_SEPOLIA.address,
      abi: BUNDLE_EXECUTOR_ABI,
      functionName: 'getFeeConfig',
    })

    return {
      feeRecipient: config.feeRecipient,
      buyFeeBps: config.buyFeeBps,
      sellFeeBps: config.sellFeeBps,
      maxFeeBps: config.maxFeeBps,
      feesEnabled: config.feesEnabled,
    }
  } catch {
    return null
  }
}

export interface BundleExecutorReadStatus {
  contractAddress: Address
  chainId: number
  owner: Address
  reachable: boolean
}

/** Read-only RPC probe — no wallet or transaction required */
export async function fetchBundleExecutorReadStatus(): Promise<BundleExecutorReadStatus> {
  const [chainId, owner] = await Promise.all([
    readSepoliaChainId(),
    readBundleExecutorOwner(),
  ])

  return {
    contractAddress: getBundleExecutorAddress(),
    chainId,
    owner,
    reachable: chainId === BUNDLE_EXECUTOR_SEPOLIA.chainId,
  }
}
