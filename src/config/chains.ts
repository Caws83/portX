import { mainnet, arbitrum, base, polygon, sepolia } from 'wagmi/chains'

/** Sepolia included for read-only BundleExecutor health checks — live execution remains disabled */
export const SUPPORTED_CHAINS = [mainnet, arbitrum, base, polygon, sepolia] as const

export const DEFAULT_CHAIN = mainnet
