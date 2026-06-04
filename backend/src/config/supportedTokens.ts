import { getToken } from '../data/tokens.js'

export const ETHEREUM_MAINNET_CHAIN_ID = 1

const NATIVE_ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

export interface TokenRouteMetadata {
  symbol: string
  name: string
  chainId: number
  address: string
  decimals: number
  isEthereumMainnetSupported: boolean
  isQuoteSupported: boolean
  reasonIfUnsupported?: string
}

/** Canonical Ethereum mainnet route metadata for 0x quote filtering */
const TOKEN_ROUTE_REGISTRY: TokenRouteMetadata[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    chainId: 1,
    address: NATIVE_ETH_ADDRESS,
    decimals: 18,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chainId: 1,
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    decimals: 18,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 1,
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    chainId: 1,
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chainId: 1,
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    decimals: 18,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    chainId: 1,
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin (WBTC route)',
    chainId: 1,
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    chainId: 1,
    address: '0x514910771af9ca656af840dff83e8264ecf986ca',
    decimals: 18,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    chainId: 1,
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    decimals: 18,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    chainId: 1,
    address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    decimals: 18,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'PEPE',
    name: 'Pepe',
    chainId: 1,
    address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    decimals: 18,
    isEthereumMainnetSupported: true,
    isQuoteSupported: true,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    chainId: 1,
    address: '0xd31a59c85ae9d8edefec4114a1b3ea1f3b9339d3',
    decimals: 9,
    isEthereumMainnetSupported: false,
    isQuoteSupported: false,
    reasonIfUnsupported: 'SOL is not supported for Ethereum 0x routing yet.',
  },
  {
    symbol: 'TAO',
    name: 'Bittensor',
    chainId: 1,
    address: '0x0000000000000000000000000000000000000001',
    decimals: 18,
    isEthereumMainnetSupported: false,
    isQuoteSupported: false,
    reasonIfUnsupported: 'TAO uses a placeholder address and is not routable on Ethereum mainnet.',
  },
  {
    symbol: 'NEAR',
    name: 'NEAR Protocol',
    chainId: 1,
    address: '0x0000000000000000000000000000000000000002',
    decimals: 24,
    isEthereumMainnetSupported: false,
    isQuoteSupported: false,
    reasonIfUnsupported: 'NEAR uses a placeholder address and is not routable on Ethereum mainnet.',
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    chainId: 1,
    address: '0x4206931337dc273fc26b3f8f6b0e0e0e0e0e0e0e',
    decimals: 8,
    isEthereumMainnetSupported: false,
    isQuoteSupported: false,
    reasonIfUnsupported: 'DOGE has no valid wrapped Ethereum mainnet token address in PortX demo data.',
  },
  {
    symbol: 'FET',
    name: 'Fetch.ai',
    chainId: 1,
    address: '0xaea46a60368a7b060f1e1ea5c2c4e0ae5d0f0f0f',
    decimals: 18,
    isEthereumMainnetSupported: false,
    isQuoteSupported: false,
    reasonIfUnsupported: 'FET uses a placeholder address and is not routable on Ethereum mainnet.',
  },
  {
    symbol: 'RNDR',
    name: 'Render',
    chainId: 1,
    address: '0x6de037ef9ad2725eb40167bb8d7c352a971e8e9f',
    decimals: 18,
    isEthereumMainnetSupported: false,
    isQuoteSupported: false,
    reasonIfUnsupported: 'RNDR is not enabled for Ethereum 0x routing in PortX v1.',
  },
]

const registryBySymbol = new Map(
  TOKEN_ROUTE_REGISTRY.map((t) => [t.symbol.toUpperCase(), t])
)

const PLACEHOLDER_ADDRESS_REASON =
  'Token address is a demo placeholder and is not valid for Ethereum mainnet routing.'

const CHAIN_UNSUPPORTED_REASON = '0x quotes are only available on Ethereum mainnet (chainId 1).'

export function normalizeRouteSymbol(symbol: string): string {
  const upper = symbol.toUpperCase()
  if (upper === 'BTC') return 'WBTC'
  return upper
}

export function isValidMainnetAddress(address: string): boolean {
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

export function getTokenRouteMetadata(symbol: string): TokenRouteMetadata | undefined {
  const normalized = normalizeRouteSymbol(symbol)
  const registered = registryBySymbol.get(normalized)
  if (registered) return { ...registered }

  const demo = getToken(symbol)
  if (!demo) return undefined

  const address =
    normalized === 'ETH' ? NATIVE_ETH_ADDRESS : demo.address
  const placeholder = !isValidMainnetAddress(address)

  return {
    symbol: demo.symbol,
    name: demo.name,
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address,
    decimals: demo.decimals,
    isEthereumMainnetSupported: !placeholder,
    isQuoteSupported: false,
    reasonIfUnsupported: placeholder
      ? PLACEHOLDER_ADDRESS_REASON
      : `${demo.symbol} is not supported for Ethereum 0x routing yet.`,
  }
}

export function getRouteSupportStats(): {
  ethereumMainnet: number
  unsupported: number
} {
  let ethereumMainnet = 0
  let unsupported = 0
  for (const token of TOKEN_ROUTE_REGISTRY) {
    if (token.isQuoteSupported) ethereumMainnet += 1
    else unsupported += 1
  }
  return { ethereumMainnet, unsupported }
}

export interface QuoteRouteValidation {
  supported: boolean
  reason: string
}

export function validateTokenForQuote(symbol: string, chainId: number): QuoteRouteValidation {
  if (chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
    return { supported: false, reason: CHAIN_UNSUPPORTED_REASON }
  }

  const meta = getTokenRouteMetadata(symbol)
  if (!meta) {
    return {
      supported: false,
      reason: `Unknown token: ${symbol}`,
    }
  }

  if (!isValidMainnetAddress(meta.address)) {
    return { supported: false, reason: PLACEHOLDER_ADDRESS_REASON }
  }

  if (!meta.isQuoteSupported) {
    return {
      supported: false,
      reason: meta.reasonIfUnsupported ?? 'Token is not supported for Ethereum 0x routing yet.',
    }
  }

  return { supported: true, reason: '' }
}

export function validateQuotePair(
  sellSymbol: string,
  buySymbol: string,
  chainId: number
): QuoteRouteValidation {
  const chainCheck = validateTokenForQuote(sellSymbol, chainId)
  if (!chainCheck.supported) return chainCheck

  return validateTokenForQuote(buySymbol, chainId)
}

export function resolveQuoteTokenAddress(symbol: string): string {
  const meta = getTokenRouteMetadata(symbol)
  if (!meta) throw new Error(`Unknown token: ${symbol}`)
  return meta.address
}
