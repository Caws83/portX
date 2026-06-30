import type { Address } from 'viem'

import type { AppMode } from '@/config/appMode'

/** Canonical chain key used across PortX registry lookups. */
export type ChainRegistryKey =
  | 'sepolia'
  | 'ethereum'
  | 'base'
  | 'arbitrum'
  | 'optimism'
  | 'bsc'
  | 'avalanche'
  | 'polygon'

export interface ChainTokenRef {
  symbol: string
  address: Address
  decimals: number
}

export interface ChainRouterRef {
  key: string
  name: string
  address: Address
}

export interface ChainRegistryEntry {
  key: ChainRegistryKey
  chainId: number
  name: string
  shortName: string
  iconKey: string
  /** Optional Vite env var for RPC override (e.g. VITE_RPC_SEPOLIA). */
  rpcEnvKey: string | null
  explorerBaseUrl: string
  nativeToken: ChainTokenRef
  wrappedNative: ChainTokenRef | null
  stablecoins: ChainTokenRef[]
  bundleExecutor: Address | null
  routers: ChainRouterRef[]
  isTestnet: boolean
  /** Chain appears in PortX network UI / wagmi scaffold. */
  enabled: boolean
  /** Live basket execution is wired for this chain today. */
  executionEnabled: boolean
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

export const CHAINS_REGISTRY: readonly ChainRegistryEntry[] = [
  {
    key: 'sepolia',
    chainId: 11155111,
    name: 'Sepolia',
    shortName: 'SEP',
    iconKey: 'ethereum',
    rpcEnvKey: 'VITE_RPC_SEPOLIA',
    explorerBaseUrl: 'https://sepolia.etherscan.io',
    nativeToken: { symbol: 'ETH', address: ZERO_ADDRESS, decimals: 18 },
    wrappedNative: {
      symbol: 'WETH',
      address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      decimals: 18,
    },
    stablecoins: [
      {
        symbol: 'USDC',
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        decimals: 6,
      },
    ],
    bundleExecutor: '0x9A0D2318EE444a3Eee64714E60b0fB3C5261C2e2',
    routers: [
      {
        key: 'uniswap-v3-swap-router02',
        name: 'Uniswap V3 SwapRouter02',
        address: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
      },
      {
        key: 'uniswap-v3-quoter-v2',
        name: 'Uniswap V3 QuoterV2',
        address: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
      },
      {
        key: 'mock-router',
        name: 'MockRouter (testnet)',
        address: '0x9963Cf861beddd418EbbD0A101DC3B135348cC2d',
      },
    ],
    isTestnet: true,
    enabled: true,
    executionEnabled: true,
  },
  {
    key: 'ethereum',
    chainId: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    iconKey: 'ethereum',
    rpcEnvKey: 'VITE_ALCHEMY_KEY',
    explorerBaseUrl: 'https://etherscan.io',
    nativeToken: { symbol: 'ETH', address: ZERO_ADDRESS, decimals: 18 },
    wrappedNative: {
      symbol: 'WETH',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
    },
    stablecoins: [
      {
        symbol: 'USDC',
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 6,
      },
    ],
    bundleExecutor: null,
    routers: [],
    isTestnet: false,
    enabled: true,
    executionEnabled: false,
  },
  {
    key: 'base',
    chainId: 8453,
    name: 'Base',
    shortName: 'BASE',
    iconKey: 'base',
    rpcEnvKey: 'VITE_RPC_BASE',
    explorerBaseUrl: 'https://basescan.org',
    nativeToken: { symbol: 'ETH', address: ZERO_ADDRESS, decimals: 18 },
    wrappedNative: {
      symbol: 'WETH',
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
    },
    stablecoins: [
      {
        symbol: 'USDC',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
      },
    ],
    bundleExecutor: null,
    routers: [],
    isTestnet: false,
    enabled: true,
    executionEnabled: false,
  },
  {
    key: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum',
    shortName: 'ARB',
    iconKey: 'arbitrum',
    rpcEnvKey: 'VITE_RPC_ARBITRUM',
    explorerBaseUrl: 'https://arbiscan.io',
    nativeToken: { symbol: 'ETH', address: ZERO_ADDRESS, decimals: 18 },
    wrappedNative: {
      symbol: 'WETH',
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      decimals: 18,
    },
    stablecoins: [
      {
        symbol: 'USDC',
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        decimals: 6,
      },
    ],
    bundleExecutor: null,
    routers: [],
    isTestnet: false,
    enabled: true,
    executionEnabled: false,
  },
  {
    key: 'optimism',
    chainId: 10,
    name: 'Optimism',
    shortName: 'OP',
    iconKey: 'optimism',
    rpcEnvKey: 'VITE_RPC_OPTIMISM',
    explorerBaseUrl: 'https://optimistic.etherscan.io',
    nativeToken: { symbol: 'ETH', address: ZERO_ADDRESS, decimals: 18 },
    wrappedNative: {
      symbol: 'WETH',
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
    },
    stablecoins: [
      {
        symbol: 'USDC',
        address: '0x0b2C639c533813c4Aa9D2767a173d48ab2deF345',
        decimals: 6,
      },
    ],
    bundleExecutor: null,
    routers: [],
    isTestnet: false,
    enabled: true,
    executionEnabled: false,
  },
  {
    key: 'bsc',
    chainId: 56,
    name: 'BNB Chain',
    shortName: 'BNB',
    iconKey: 'bnb',
    rpcEnvKey: 'VITE_RPC_BSC',
    explorerBaseUrl: 'https://bscscan.com',
    nativeToken: { symbol: 'BNB', address: ZERO_ADDRESS, decimals: 18 },
    wrappedNative: {
      symbol: 'WBNB',
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      decimals: 18,
    },
    stablecoins: [
      {
        symbol: 'USDC',
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        decimals: 18,
      },
    ],
    bundleExecutor: null,
    routers: [],
    isTestnet: false,
    enabled: true,
    executionEnabled: false,
  },
  {
    key: 'avalanche',
    chainId: 43114,
    name: 'Avalanche',
    shortName: 'AVAX',
    iconKey: 'avalanche',
    rpcEnvKey: 'VITE_RPC_AVALANCHE',
    explorerBaseUrl: 'https://snowtrace.io',
    nativeToken: { symbol: 'AVAX', address: ZERO_ADDRESS, decimals: 18 },
    wrappedNative: {
      symbol: 'WAVAX',
      address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      decimals: 18,
    },
    stablecoins: [
      {
        symbol: 'USDC',
        address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        decimals: 6,
      },
    ],
    bundleExecutor: null,
    routers: [],
    isTestnet: false,
    enabled: true,
    executionEnabled: false,
  },
  {
    key: 'polygon',
    chainId: 137,
    name: 'Polygon',
    shortName: 'MATIC',
    iconKey: 'polygon',
    rpcEnvKey: 'VITE_RPC_POLYGON',
    explorerBaseUrl: 'https://polygonscan.com',
    nativeToken: { symbol: 'POL', address: ZERO_ADDRESS, decimals: 18 },
    wrappedNative: {
      symbol: 'WPOL',
      address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      decimals: 18,
    },
    stablecoins: [
      {
        symbol: 'USDC',
        address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        decimals: 6,
      },
    ],
    bundleExecutor: null,
    routers: [],
    isTestnet: false,
    enabled: true,
    executionEnabled: false,
  },
] as const

const CHAINS_BY_ID = new Map<number, ChainRegistryEntry>(
  CHAINS_REGISTRY.map((chain) => [chain.chainId, chain]),
)

const CHAINS_BY_KEY = new Map<ChainRegistryKey, ChainRegistryEntry>(
  CHAINS_REGISTRY.map((chain) => [chain.key, chain]),
)

export function getChainById(chainId: number): ChainRegistryEntry | undefined {
  return CHAINS_BY_ID.get(chainId)
}

export function getChainByKey(key: ChainRegistryKey): ChainRegistryEntry | undefined {
  return CHAINS_BY_KEY.get(key)
}

export function getEnabledChains(): ChainRegistryEntry[] {
  return CHAINS_REGISTRY.filter((chain) => chain.enabled)
}

export function getDefaultChainForAppMode(mode: AppMode): ChainRegistryEntry {
  return mode === 'testnet'
    ? CHAINS_BY_KEY.get('sepolia')!
    : CHAINS_BY_KEY.get('ethereum')!
}

export function getExplorerTxUrl(chainId: number, txHash: string): string | undefined {
  const chain = getChainById(chainId)
  if (!chain) return undefined
  return `${chain.explorerBaseUrl}/tx/${txHash}`
}

export function getBundleExecutorAddress(chainId: number): Address | undefined {
  return getChainById(chainId)?.bundleExecutor ?? undefined
}

export function isChainExecutionEnabled(chainId: number): boolean {
  return getChainById(chainId)?.executionEnabled ?? false
}
