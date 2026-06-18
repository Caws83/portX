import { SEPOLIA_TESTNET } from '@/config/networks'

/** Sepolia BundleExecutor — T-2 hardened; update address after redeploy */
export const BUNDLE_EXECUTOR_SEPOLIA = {
  name: 'BundleExecutor',
  address: '0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B' as const,
  chainId: SEPOLIA_TESTNET.chainId,
  networkLabel: SEPOLIA_TESTNET.label,
  verified: true,
  explorerUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/address/0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B#code`,
  deploymentTxUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/tx/0xd51002352cafc5f6b19dcfef20e9e43e7394dedbce7dfe0af065c4b7e9f0cc82`,
} as const

/** Sepolia MockRouter — Phase C testnet executeBasket only */
export const MOCK_ROUTER_SEPOLIA = {
  name: 'MockRouter',
  address: '0x9963Cf861beddd418EbbD0A101DC3B135348cC2d' as const,
  chainId: SEPOLIA_TESTNET.chainId,
  explorerUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/address/0x9963Cf861beddd418EbbD0A101DC3B135348cC2d`,
} as const
