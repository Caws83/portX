/** Align with `SupportedChain` in src/types/chain.ts */
export type ChainKey = 'ethereum' | 'base' | 'avalanche' | 'bsc' | 'solana'

export type ChainStatus = 'active' | 'planned'

export interface ChainConfig {
  key: ChainKey
  chainId: number
  name: string
  nativeSymbol: string
  isEvm: boolean
  defaultRouterProvider: string
  status: ChainStatus
  notes: string
}

/**
 * Chain registry for multi-chain basket planning.
 * Does not affect quote API behavior until explicitly imported by routes/services.
 */
export const CHAIN_CONFIG: Record<ChainKey, ChainConfig> = {
  ethereum: {
    key: 'ethereum',
    chainId: 1,
    name: 'Ethereum',
    nativeSymbol: 'ETH',
    isEvm: true,
    defaultRouterProvider: '0x',
    status: 'active',
    notes:
      'Phase 1 live quotes via 0x on mainnet; token allowlist in supportedTokens.ts. Live execution disabled.',
  },
  base: {
    key: 'base',
    chainId: 8453,
    name: 'Base',
    nativeSymbol: 'ETH',
    isEvm: true,
    defaultRouterProvider: '0x',
    status: 'planned',
    notes:
      'Phase 1 planned basket: ETH, USDC, cbBTC, AERO, VIRTUAL. Aerodrome may supplement 0x routing.',
  },
  avalanche: {
    key: 'avalanche',
    chainId: 43114,
    name: 'Avalanche C-Chain',
    nativeSymbol: 'AVAX',
    isEvm: true,
    defaultRouterProvider: '0x',
    status: 'planned',
    notes:
      'Phase 1 planned basket: AVAX, USDC, JOE, GMX (confirm GMX router support before quotes).',
  },
  bsc: {
    key: 'bsc',
    chainId: 56,
    name: 'BNB Smart Chain',
    nativeSymbol: 'BNB',
    isEvm: true,
    defaultRouterProvider: '0x',
    status: 'planned',
    notes:
      'Included for future EVM expansion; no curated basket template in Phase 1 docs yet.',
  },
  solana: {
    key: 'solana',
    chainId: 101,
    name: 'Solana',
    nativeSymbol: 'SOL',
    isEvm: false,
    defaultRouterProvider: 'jupiter',
    status: 'planned',
    notes:
      'Phase 1 planned basket: SOL, USDC, JUP, RAY, BONK. chainId 101 is a planning sentinel; bridge SDKs may use other identifiers.',
  },
}

export function getChainConfig(key: ChainKey): ChainConfig {
  return CHAIN_CONFIG[key]
}

export function listChainConfigs(): ChainConfig[] {
  return Object.values(CHAIN_CONFIG)
}
