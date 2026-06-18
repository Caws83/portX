import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient } from 'wagmi'
import { createPublicClient, formatUnits, http, type Address, type PublicClient } from 'viem'
import { sepolia } from 'viem/chains'
import { TESTNET_BASKET_TOKENS } from '@/config/testnetBasketTokens'
import {
  TESTNET_SEPOLIA_CHAIN_ID,
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

const ON_CHAIN_WALLET_SOURCE = 'On-chain wallet' as const

const TESTNET_PORTFOLIO_TOKEN_DEFINITIONS = Object.values(TESTNET_BASKET_TOKENS).map((token) => ({
  symbol: token.symbol,
  tokenAddress: token.address,
  decimals: token.decimals,
  displayFractionDigits: token.symbol === 'USDC' ? 6 : 8,
}))

export interface TestnetOnChainBalances {
  balancesWei: Record<string, bigint>
}

export interface TestnetPortfolioAsset {
  symbol: string
  tokenAddress: Address
  balanceWei: bigint
  balanceFormatted: string
  balanceDisplay: string
  decimals: number
  source: typeof ON_CHAIN_WALLET_SOURCE
}

export interface TestnetPortfolioBalancesResult {
  walletAddress: Address | null
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

async function fetchTestnetWalletBalances(
  publicClient: PublicClient,
  holder: Address,
): Promise<TestnetOnChainBalances> {
  const entries = await Promise.all(
    TESTNET_PORTFOLIO_TOKEN_DEFINITIONS.map(async (token) => {
      const balanceWei = await readErc20Balance(publicClient, token.tokenAddress, holder)
      return [token.symbol, balanceWei] as const
    }),
  )

  return {
    balancesWei: Object.fromEntries(entries),
  }
}

export function useTestnetPortfolioBalances(): TestnetPortfolioBalancesResult {
  const { address } = useAccount()
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
      address,
      ...TESTNET_PORTFOLIO_TOKEN_DEFINITIONS.map((token) => token.tokenAddress),
    ],
    queryFn: () => fetchTestnetWalletBalances(publicClient, address as Address),
    enabled: Boolean(address),
    staleTime: 15_000,
    retry: 1,
  })

  const assets: TestnetPortfolioAsset[] = TESTNET_PORTFOLIO_TOKEN_DEFINITIONS.map((token) => {
    const balanceWei = query.data?.balancesWei[token.symbol] ?? 0n
    const balanceFormatted = formatUnits(balanceWei, token.decimals)
    const balanceNumeric = parseTokenAmount(balanceFormatted)

    return {
      symbol: token.symbol,
      tokenAddress: token.tokenAddress,
      balanceWei,
      balanceFormatted,
      balanceDisplay: formatTokenAmount(balanceNumeric, token.displayFractionDigits),
      decimals: token.decimals,
      source: ON_CHAIN_WALLET_SOURCE,
    }
  })

  const usdcAsset = assets.find((asset) => asset.symbol === 'USDC')
  const wethAsset = assets.find((asset) => asset.symbol === 'WETH')
  const usdcBalance = parseTokenAmount(usdcAsset?.balanceFormatted ?? '0')
  const wethBalance = parseTokenAmount(wethAsset?.balanceFormatted ?? '0')
  const localTrackedUsdc = getTestnetPortfolioAggregate().totalUsdcReceived
  const usdcDifference = localTrackedUsdc - usdcBalance

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
    walletAddress: address ?? null,
    usdcBalance,
    wethBalance,
    usdcBalanceFormatted: formatTokenAmount(usdcBalance, 6),
    wethBalanceFormatted: formatTokenAmount(wethBalance, 8),
    localTrackedUsdc,
    usdcDifference,
    assets,
    assetCount: assets.length,
    valuation,
    isLoading: Boolean(address) && query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    lastRefreshedAt: query.isSuccess ? query.dataUpdatedAt : null,
    refresh: () => {
      void query.refetch()
    },
  }
}
