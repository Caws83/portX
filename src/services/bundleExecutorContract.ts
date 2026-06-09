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
