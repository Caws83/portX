import { SEPOLIA_TESTNET } from '@/config/networks'

/** Sepolia BundleExecutor — read-only registry; not wired for live execution */
export const BUNDLE_EXECUTOR_SEPOLIA = {
  name: 'BundleExecutor',
  address: '0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B' as const,
  chainId: SEPOLIA_TESTNET.chainId,
  networkLabel: SEPOLIA_TESTNET.label,
  verified: true,
  explorerUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/address/0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B#code`,
  deploymentTxUrl: `${SEPOLIA_TESTNET.explorerBaseUrl}/tx/0xd51002352cafc5f6b19dcfef20e9e43e7394dedbce7dfe0af065c4b7e9f0cc82`,
} as const
