import { http } from 'wagmi'
import type { Transport } from 'viem'
import { mainnet } from 'viem/chains'

const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY?.trim()

/** Alchemy mainnet RPC when VITE_ALCHEMY_KEY is set; otherwise viem default public RPC. */
export function getMainnetHttpTransport(): Transport {
  if (alchemyKey) {
    return http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`)
  }
  return http()
}

export function hasAlchemyMainnetRpc(): boolean {
  return Boolean(alchemyKey)
}

export function getMainnetRpcLabel(): string {
  return hasAlchemyMainnetRpc()
    ? 'Alchemy (VITE_ALCHEMY_KEY)'
    : `Public RPC (${mainnet.name})`
}
