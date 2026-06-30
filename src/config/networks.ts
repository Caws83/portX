import { IS_TESTNET_MODE } from '@/config/appMode'
import { getExplorerTxUrl as getRegistryExplorerTxUrl } from '@/config/chainsRegistry'

/**
 * Legacy network scaffold — prefer src/config/chainsRegistry.ts for new code.
 * Kept for gradual migration; do not add new chain constants here.
 */
export type NetworkKey = 'ethereum-mainnet' | 'sepolia'

export interface NetworkConfig {
  key: NetworkKey
  chainId: number
  name: string
  shortName: string
  isTestnet: boolean
  nativeCurrency: { name: string; symbol: string; decimals: number }
  explorerBaseUrl: string
  /** Human-readable label for Settings / debug UI */
  label: string
}

export const ETHEREUM_MAINNET: NetworkConfig = {
  key: 'ethereum-mainnet',
  chainId: 1,
  name: 'Ethereum',
  shortName: 'ETH',
  isTestnet: false,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  explorerBaseUrl: 'https://etherscan.io',
  label: 'Ethereum Mainnet',
}

export const SEPOLIA_TESTNET: NetworkConfig = {
  key: 'sepolia',
  chainId: 11155111,
  name: 'Sepolia',
  shortName: 'SEP',
  isTestnet: true,
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  explorerBaseUrl: 'https://sepolia.etherscan.io',
  label: 'Sepolia Testnet',
}

/** Target network for the current app mode (scaffold — does not switch wallet yet) */
export function getActiveNetworkConfig(): NetworkConfig {
  return IS_TESTNET_MODE ? SEPOLIA_TESTNET : ETHEREUM_MAINNET
}

export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  if (chainId === ETHEREUM_MAINNET.chainId) return ETHEREUM_MAINNET
  if (chainId === SEPOLIA_TESTNET.chainId) return SEPOLIA_TESTNET
  return undefined
}

export function getExplorerTxUrl(chainId: number, txHash: string): string | undefined {
  return getRegistryExplorerTxUrl(chainId, txHash)
}
