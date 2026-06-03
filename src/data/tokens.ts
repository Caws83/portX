import type { Token } from '@/types/token'

/** Local fallback token list — used when GET /tokens API is unavailable. */
export const DEMO_TOKENS: Token[] = [
  { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, priceUsd: 3450, change24h: 2.4 },
  { symbol: 'BTC', name: 'Bitcoin', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', decimals: 8, priceUsd: 98500, change24h: 1.8 },
  { symbol: 'SOL', name: 'Solana', address: '0xd31a59c85ae9d8edefec4114a1b3ea1f3b9339d3', decimals: 9, priceUsd: 178, change24h: 5.2 },
  { symbol: 'LINK', name: 'Chainlink', address: '0x514910771af9ca656af840dff83e8264ecf986ca', decimals: 18, priceUsd: 18.5, change24h: -0.8 },
  { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', decimals: 18, priceUsd: 12.2, change24h: 3.1 },
  { symbol: 'AAVE', name: 'Aave', address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', decimals: 18, priceUsd: 285, change24h: 1.5 },
  { symbol: 'ARB', name: 'Arbitrum', address: '0xb50721bcf8d664c30458cf47f1c4c3a0e0e0e0e0', decimals: 18, priceUsd: 0.92, change24h: 4.2 },
  { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', decimals: 18, priceUsd: 1.85, change24h: 2.9 },
  { symbol: 'FET', name: 'Fetch.ai', address: '0xaea46a60368a7b060f1e1ea5c2c4e0ae5d0f0f0f', decimals: 18, priceUsd: 1.42, change24h: 8.5 },
  { symbol: 'RNDR', name: 'Render', address: '0x6de037ef9ad2725eb40167bb8d7c352a971e8e9f', decimals: 18, priceUsd: 7.8, change24h: 6.2 },
  { symbol: 'PEPE', name: 'Pepe', address: '0x6982508145454ce325ddbe47a25d4ec3d2311933', decimals: 18, priceUsd: 0.000012, change24h: 12.4 },
  { symbol: 'DOGE', name: 'Dogecoin', address: '0x4206931337dc273fc26b3f8f6b0e0e0e0e0e0e0e', decimals: 8, priceUsd: 0.32, change24h: 3.8 },
  { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, priceUsd: 1.0, change24h: 0.01 },
  { symbol: 'USDT', name: 'Tether', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6, priceUsd: 1.0, change24h: 0.0 },
  { symbol: 'DAI', name: 'Dai', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18, priceUsd: 1.0, change24h: 0.02 },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', decimals: 8, priceUsd: 98400, change24h: 1.7 },
  { symbol: 'TAO', name: 'Bittensor', address: '0x0000000000000000000000000000000000000001', decimals: 18, priceUsd: 420, change24h: 6.1 },
  { symbol: 'NEAR', name: 'NEAR Protocol', address: '0x0000000000000000000000000000000000000002', decimals: 24, priceUsd: 5.2, change24h: 3.4 },
]

export function getTokenBySymbol(symbol: string): Token | undefined {
  return DEMO_TOKENS.find((t) => t.symbol === symbol)
}
