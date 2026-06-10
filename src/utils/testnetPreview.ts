import { TESTNET_SEPOLIA_CHAIN_ID } from '@/config/testnetExecution'
import type { BasketQuotePreview } from '@/types/quote'

export function isTestnetSepoliaUniswapPreview(preview: BasketQuotePreview): boolean {
  return (
    preview.chainId === TESTNET_SEPOLIA_CHAIN_ID &&
    preview.legs.some((leg) => leg.bestQuote.provider === 'uniswap-sepolia')
  )
}
