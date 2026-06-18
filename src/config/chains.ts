import { Address } from 'viem'
import { mainnet, arbitrum, base, polygon, sepolia } from 'wagmi/chains'

/** Sepolia included for read-only BundleExecutor health checks — live execution remains disabled */
export const SUPPORTED_CHAINS = [mainnet, arbitrum, base, polygon, sepolia] as const

export const DEFAULT_CHAIN = mainnet

export const NFT_ADDRESS = '' as Address  // change this when deployed nft
export const NFT_CHAIN = DEFAULT_CHAIN

export const IPFS_GATEWAY = 'https://ipfs.io/ipfs/'

export const NFT_DEMO_MODE = !NFT_ADDRESS
