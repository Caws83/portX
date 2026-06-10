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
