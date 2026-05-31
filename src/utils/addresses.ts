/** Mainnet placeholder addresses — replace with chain-aware registry */

export const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

/** Aggregator router placeholders */
export const ROUTER_ADDRESSES = {
  '0x': '0xdef1c0ded9bec7b1d5460550f41f0a0e1e2e3e4e',
  '1inch': '0x111111125421ca6dc452d289314280a0f8842a65',
  uniswap: '0x3fc91a3afd7039651d5938a7e06bd7b3d3222b5f',
} as const

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function isZeroAddress(address: string): boolean {
  return address.toLowerCase() === ZERO_ADDRESS
}
