import { SEPOLIA_TESTNET } from '@/config/networks'

/** Sepolia BundleExecutor — T-2 hardened; update address after redeploy */
export const BUNDLE_EXECUTOR_SEPOLIA = {
  name: 'BundleExecutor',
  address: '0x62cf7897E37155404658f885743BAfE4CDd58890' as const,
  chainId: SEPOLIA_TESTNET.chainId,
  networkLabel: SEPOLIA_TESTNET.label,
  verified: false,
  explorerUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/address/0x62cf7897E37155404658f885743BAfE4CDd58890#code`,
  deploymentTxUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/tx/0x6d310244583cdc9a2a10e0d4afadae6ac6790508c58b2f76f949d7edebbc8e51`,
} as const

/** Sepolia MockRouter — Phase C testnet executeBasket only */
export const MOCK_ROUTER_SEPOLIA = {
  name: 'MockRouter',
  address: '0x9963Cf861beddd418EbbD0A101DC3B135348cC2d' as const,
  chainId: SEPOLIA_TESTNET.chainId,
  explorerUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/address/0x9963Cf861beddd418EbbD0A101DC3B135348cC2d`,
} as const
