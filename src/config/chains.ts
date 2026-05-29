import { mainnet, arbitrum, base, polygon } from 'wagmi/chains'

export const SUPPORTED_CHAINS = [mainnet, arbitrum, base, polygon] as const

export const DEFAULT_CHAIN = mainnet
