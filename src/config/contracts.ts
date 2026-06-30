import { SEPOLIA_TESTNET } from '@/config/networks'

/**
 * Legacy deployed contract addresses — prefer src/config/chainsRegistry.ts for new lookups.
 * Kept until execution hooks migrate (CHAIN-3+).
 */
export const BUNDLE_EXECUTOR_SEPOLIA = {
  name: 'BundleExecutor',
  address: '0x9A0D2318EE444a3Eee64714E60b0fB3C5261C2e2' as const,
  chainId: SEPOLIA_TESTNET.chainId,
  networkLabel: SEPOLIA_TESTNET.label,
  verified: true,
  explorerUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/address/0x9A0D2318EE444a3Eee64714E60b0fB3C5261C2e2#code`,
  deploymentTxUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/tx/0xd5228bb608dedb5ea7fe3e7c130a0cc61d6080a0943eeea10e7d65da5f368950`,
} as const

/** Sepolia MockRouter — Phase C testnet executeBasket only */
export const MOCK_ROUTER_SEPOLIA = {
  name: 'MockRouter',
  address: '0x9963Cf861beddd418EbbD0A101DC3B135348cC2d' as const,
  chainId: SEPOLIA_TESTNET.chainId,
  explorerUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/address/0x9963Cf861beddd418EbbD0A101DC3B135348cC2d`,
} as const
