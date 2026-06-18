import { Address } from 'viem'
import { mainnet, arbitrum, base, polygon, sepolia } from 'wagmi/chains'

import { ENABLE_TESTNET_MODE } from '@/config/features'

/** Sepolia included for read-only BundleExecutor health checks — live execution remains disabled */
export const SUPPORTED_CHAINS = [mainnet, arbitrum, base, polygon, sepolia] as const

export const DEFAULT_CHAIN = mainnet

/** Sepolia Genesis NFT — set after portx-sepolia-genesis-nft deploy; empty on mainnet */
const SEPOLIA_GENESIS_NFT_ADDRESS =
  '0x66454FA3E76d88F322EFF4996d2994bFcc26d9F4' as Address

export const NFT_ADDRESS = (ENABLE_TESTNET_MODE ? SEPOLIA_GENESIS_NFT_ADDRESS : '') as Address

/** Sepolia (11155111) in testnet mode; mainnet otherwise — no mainnet NFT execution enabled */
export const NFT_CHAIN_ID = ENABLE_TESTNET_MODE ? 11155111 : mainnet.id

export const NFT_CHAIN = ENABLE_TESTNET_MODE ? sepolia : DEFAULT_CHAIN

export const IPFS_GATEWAY = 'https://ipfs.io/ipfs/'

/** Demo/disabled mint UI when no contract address is configured */
export const NFT_DEMO_MODE = !NFT_ADDRESS
