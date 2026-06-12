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
import {
  computeTestnetPortfolioValuation,
  type TestnetPortfolioValuation,
} from '@/services/testnetPortfolioPricing'

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

const ON_CHAIN_BUNDLE_EXECUTOR_SOURCE = 'On-chain BundleExecutor' as const

const TESTNET_PORTFOLIO_TOKEN_DEFINITIONS = [
  {
    symbol: 'USDC',
    tokenAddress: TESTNET_USDC_ADDRESS,
    decimals: USDC_DECIMALS,
    displayFractionDigits: 6,
  },
  {
    symbol: 'WETH',
    tokenAddress: TESTNET_WETH_ADDRESS,
    decimals: WETH_DECIMALS,
    displayFractionDigits: 8,
  },
] as const

export interface TestnetOnChainBalances {
  usdcBalanceWei: bigint
  wethBalanceWei: bigint
}

export interface TestnetPortfolioAsset {
  symbol: string
  tokenAddress: Address
  balanceWei: bigint
  balanceFormatted: string
  balanceDisplay: string
  decimals: number
  source: typeof ON_CHAIN_BUNDLE_EXECUTOR_SOURCE
}

export interface TestnetPortfolioBalancesResult {
  bundleExecutorAddress: Address
  usdcBalance: number
  wethBalance: number
  usdcBalanceFormatted: string
  wethBalanceFormatted: string
  localTrackedUsdc: number
  usdcDifference: number
  assets: TestnetPortfolioAsset[]
  assetCount: number
  valuation: TestnetPortfolioValuation
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

  const balanceWeiBySymbol: Record<string, bigint> = {
    USDC: query.data?.usdcBalanceWei ?? 0n,
    WETH: query.data?.wethBalanceWei ?? 0n,
  }

  const assets: TestnetPortfolioAsset[] = TESTNET_PORTFOLIO_TOKEN_DEFINITIONS.map(
    (token) => {
      const balanceWei = balanceWeiBySymbol[token.symbol] ?? 0n
      const balanceFormatted = formatUnits(balanceWei, token.decimals)
      const balanceNumeric = parseTokenAmount(balanceFormatted)

      return {
        symbol: token.symbol,
        tokenAddress: token.tokenAddress,
        balanceWei,
        balanceFormatted,
        balanceDisplay: formatTokenAmount(balanceNumeric, token.displayFractionDigits),
        decimals: token.decimals,
        source: ON_CHAIN_BUNDLE_EXECUTOR_SOURCE,
      }
    },
  )

  const valuation = computeTestnetPortfolioValuation(
    assets.map((asset) => ({
      symbol: asset.symbol,
      balanceNumeric: parseTokenAmount(asset.balanceFormatted),
      balanceDisplay: asset.balanceDisplay,
      tokenAddress: asset.tokenAddress,
      decimals: asset.decimals,
      source: asset.source,
    })),
  )

  return {
    bundleExecutorAddress: TESTNET_BUNDLE_EXECUTOR_ADDRESS,
    usdcBalance,
    wethBalance,
    usdcBalanceFormatted: formatTokenAmount(usdcBalance, 6),
    wethBalanceFormatted: formatTokenAmount(wethBalance, 8),
    localTrackedUsdc,
    usdcDifference,
    assets,
    assetCount: assets.length,
    valuation,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    lastRefreshedAt: query.isSuccess ? query.dataUpdatedAt : null,
    refresh: () => {
      void query.refetch()
    },
  }
}
