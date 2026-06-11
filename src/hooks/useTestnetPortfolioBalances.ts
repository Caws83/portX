import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { createPublicClient, formatUnits, http, type Address, type PublicClient } from 'viem'
import { sepolia } from 'viem/chains'
import {
  TESTNET_BUNDLE_EXECUTOR_ADDRESS,
  TESTNET_SEPOLIA_CHAIN_ID,
  TESTNET_USDC_ADDRESS,
  TESTNET_WETH_ADDRESS,
} from '@/config/testnetExecution'
import { getTestnetPortfolioAggregate } from '@/services/testnetPortfolio'

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

const USDC_DECIMALS = 6
const WETH_DECIMALS = 18

export interface TestnetOnChainBalances {
  usdcBalanceWei: bigint
  wethBalanceWei: bigint
}

export interface TestnetPortfolioBalancesResult {
  bundleExecutorAddress: Address
  usdcBalance: number
  wethBalance: number
  usdcBalanceFormatted: string
  wethBalanceFormatted: string
  localTrackedUsdc: number
  usdcDifference: number
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  lastRefreshedAt: number | null
  refresh: () => void
}

function parseTokenAmount(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatTokenAmount(value: number, maximumFractionDigits: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits })
}

async function readErc20Balance(
  publicClient: PublicClient,
  tokenAddress: Address,
  holder: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [holder],
  })
}

async function fetchTestnetOnChainBalances(
  publicClient: PublicClient,
): Promise<TestnetOnChainBalances> {
  const holder = TESTNET_BUNDLE_EXECUTOR_ADDRESS
  const [usdcBalanceWei, wethBalanceWei] = await Promise.all([
    readErc20Balance(publicClient, TESTNET_USDC_ADDRESS, holder),
    readErc20Balance(publicClient, TESTNET_WETH_ADDRESS, holder),
  ])

  return { usdcBalanceWei, wethBalanceWei }
}

export function useTestnetPortfolioBalances(): TestnetPortfolioBalancesResult {
  const wagmiPublicClient = usePublicClient({ chainId: TESTNET_SEPOLIA_CHAIN_ID })

  const publicClient = useMemo(() => {
    if (wagmiPublicClient) return wagmiPublicClient
    return createPublicClient({
      chain: sepolia,
      transport: http(),
    })
  }, [wagmiPublicClient])

  const query = useQuery({
    queryKey: [
      'testnetPortfolioBalances',
      TESTNET_BUNDLE_EXECUTOR_ADDRESS,
      TESTNET_USDC_ADDRESS,
      TESTNET_WETH_ADDRESS,
    ],
    queryFn: () => fetchTestnetOnChainBalances(publicClient),
    staleTime: 15_000,
    retry: 1,
  })

  const usdcBalanceFormatted = query.data
    ? formatUnits(query.data.usdcBalanceWei, USDC_DECIMALS)
    : '0'
  const wethBalanceFormatted = query.data
    ? formatUnits(query.data.wethBalanceWei, WETH_DECIMALS)
    : '0'

  const usdcBalance = parseTokenAmount(usdcBalanceFormatted)
  const wethBalance = parseTokenAmount(wethBalanceFormatted)
  const localTrackedUsdc = getTestnetPortfolioAggregate().totalUsdcReceived
  const usdcDifference = localTrackedUsdc - usdcBalance

  return {
    bundleExecutorAddress: TESTNET_BUNDLE_EXECUTOR_ADDRESS,
    usdcBalance,
    wethBalance,
    usdcBalanceFormatted: formatTokenAmount(usdcBalance, 6),
    wethBalanceFormatted: formatTokenAmount(wethBalance, 8),
    localTrackedUsdc,
    usdcDifference,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    lastRefreshedAt: query.isSuccess ? query.dataUpdatedAt : null,
    refresh: () => {
      void query.refetch()
    },
  }
}
