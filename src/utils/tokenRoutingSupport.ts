import { getTokenBySymbol } from '@/data/tokens'

/** Asset routing label for Create Basket — mirrors backend route registry (read-only UI). */
export type TokenRoutingSupportStatus = 'supported' | 'planned' | 'unsupported'

const NATIVE_ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const ETHEREUM_MAINNET_CHAIN_ID = 1

interface TokenRouteMeta {
  symbol: string
  isQuoteSupported: boolean
  isEthereumMainnetSupported: boolean
  reasonIfUnsupported?: string
}

/** Symbols with live Ethereum mainnet quote routing in PortX v1 */
const QUOTE_SUPPORTED = new Set([
  'ETH',
  'WETH',
  'USDC',
  'USDT',
  'DAI',
  'WBTC',
  'BTC',
  'LINK',
  'UNI',
  'AAVE',
  'PEPE',
])

/** Cross-chain or v1-deferred assets shown as planned routing */
const PLANNED_ROUTING = new Set(['SOL', 'ARB', 'OP', 'NEAR', 'TAO', 'RNDR'])

function normalizeSymbol(symbol: string): string {
  const upper = symbol.toUpperCase()
  return upper === 'BTC' ? 'WBTC' : upper
}

function isValidMainnetAddress(address: string): boolean {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false
  const lower = address.toLowerCase()
  if (lower === NATIVE_ETH_ADDRESS) return true
  if (/^0x0{39}[0-9a-f]$/.test(lower)) return false
  if (lower === '0x0000000000000000000000000000000000000001') return false
  if (lower === '0x0000000000000000000000000000000000000002') return false
  if (lower.startsWith('0x00000000000000000000000000000000000000')) return false
  if (lower.includes('e0e0e0e0e0e0e0e')) return false
  if (lower.includes('aea46a60368a7b060f1e1ea5c2c4e0ae5d0f0f0f')) return false
  return true
}

function getTokenRouteMeta(symbol: string): TokenRouteMeta | undefined {
  const normalized = normalizeSymbol(symbol)
  const displaySymbol = symbol.toUpperCase()

  if (QUOTE_SUPPORTED.has(normalized) || QUOTE_SUPPORTED.has(displaySymbol)) {
    return {
      symbol: displaySymbol,
      isQuoteSupported: true,
      isEthereumMainnetSupported: true,
    }
  }

  if (PLANNED_ROUTING.has(displaySymbol)) {
    return {
      symbol: displaySymbol,
      isQuoteSupported: false,
      isEthereumMainnetSupported: false,
      reasonIfUnsupported: `${displaySymbol} routing is planned for a future PortX release.`,
    }
  }

  const demo = getTokenBySymbol(symbol)
  if (!demo) {
    return {
      symbol: displaySymbol,
      isQuoteSupported: false,
      isEthereumMainnetSupported: false,
      reasonIfUnsupported: `Unknown token: ${displaySymbol}`,
    }
  }

  const address = normalized === 'ETH' ? NATIVE_ETH_ADDRESS : demo.address
  const validAddress = isValidMainnetAddress(address)

  return {
    symbol: demo.symbol,
    isQuoteSupported: false,
    isEthereumMainnetSupported: validAddress,
    reasonIfUnsupported: validAddress
      ? `${demo.symbol} is not supported for Ethereum routing yet.`
      : 'Token address is a demo placeholder and is not valid for Ethereum mainnet routing.',
  }
}

export function getTokenRoutingSupportStatus(symbol: string): TokenRoutingSupportStatus {
  const meta = getTokenRouteMeta(symbol)
  if (!meta) return 'unsupported'
  if (meta.isQuoteSupported) return 'supported'
  if (PLANNED_ROUTING.has(meta.symbol)) return 'planned'
  if (meta.isEthereumMainnetSupported) return 'planned'
  return 'unsupported'
}

export function getTokenRoutingSupportLabel(status: TokenRoutingSupportStatus): string {
  switch (status) {
    case 'supported':
      return 'Supported'
    case 'planned':
      return 'Planned'
    default:
      return 'Unsupported'
  }
}

export type BasketRoutingSupportSummary =
  | 'fully-supported'
  | 'partially-supported'
  | 'planned-routing'
  | 'contains-unsupported'

export function summarizeBasketRoutingSupport(symbols: string[]): {
  status: BasketRoutingSupportSummary
  label: string
  detail: string
} {
  if (symbols.length === 0) {
    return {
      status: 'contains-unsupported',
      label: 'No assets selected',
      detail: 'Add at least two assets to estimate routing support.',
    }
  }

  const statuses = symbols.map(getTokenRoutingSupportStatus)
  const supportedCount = statuses.filter((s) => s === 'supported').length
  const plannedCount = statuses.filter((s) => s === 'planned').length
  const unsupportedCount = statuses.filter((s) => s === 'unsupported').length

  if (unsupportedCount > 0) {
    return {
      status: 'contains-unsupported',
      label: 'Contains unsupported assets',
      detail: `${unsupportedCount} selected asset(s) are not routable on Ethereum mainnet today.`,
    }
  }

  if (supportedCount === symbols.length) {
    return {
      status: 'fully-supported',
      label: 'Fully supported',
      detail: 'All selected assets support Ethereum mainnet quote preview.',
    }
  }

  if (plannedCount === symbols.length) {
    return {
      status: 'planned-routing',
      label: 'Planned routing',
      detail: 'Selected assets are on the PortX routing roadmap for Ethereum mainnet.',
    }
  }

  return {
    status: 'partially-supported',
    label: 'Partially supported',
    detail: `${supportedCount} supported · ${plannedCount} planned on Ethereum mainnet.`,
  }
}

export const CREATE_BASKET_NETWORK_LABEL = 'Ethereum Mainnet'
export const CREATE_BASKET_CHAIN_ID = ETHEREUM_MAINNET_CHAIN_ID
