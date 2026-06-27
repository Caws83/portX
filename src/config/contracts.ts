import { SEPOLIA_TESTNET } from '@/config/networks'

/** Sepolia BundleExecutor — C-2 fee config; update address after redeploy */
export const BUNDLE_EXECUTOR_SEPOLIA = {
  name: 'BundleExecutor',
  address: '0xcEcA20114623B87d638E785af4f3756eb4ced061' as const,
  chainId: SEPOLIA_TESTNET.chainId,
  networkLabel: SEPOLIA_TESTNET.label,
  verified: true,
  explorerUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/address/0xcEcA20114623B87d638E785af4f3756eb4ced061#code`,
  deploymentTxUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/tx/0x8cef26c3a24f372418d3760f6bb1714302e2201dd19d611ab8bc6026c00ac3cf`,
} as const

/** Sepolia MockRouter — Phase C testnet executeBasket only */
export const MOCK_ROUTER_SEPOLIA = {
  name: 'MockRouter',
  address: '0x9963Cf861beddd418EbbD0A101DC3B135348cC2d' as const,
  chainId: SEPOLIA_TESTNET.chainId,
  explorerUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/address/0x9963Cf861beddd418EbbD0A101DC3B135348cC2d`,
} as const
