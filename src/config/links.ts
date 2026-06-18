import { ENABLE_TESTNET_MODE } from '@/config/features'

/** Mint page route in testnet mode; placeholder until mainnet mint goes live */
export const PORTX_NFT_URL = ENABLE_TESTNET_MODE ? '/mint' : '#'
